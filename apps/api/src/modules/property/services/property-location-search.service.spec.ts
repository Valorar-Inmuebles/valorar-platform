jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PropertyLocationSearchService } from './property-location-search.service';
import type { PropertyLocationSearchDto } from '../dto/property-location-search.dto';

const dto: PropertyLocationSearchDto = {
  street: 'Calle Falsa',
  streetNumber: '123',
  provinceId: 'p',
  localityId: 'l',
  country: 'AR',
};
const user = { id: 'u', tenantId: 't', role: 'AGENT' } as never;
function setup() {
  const geo = {
    findProvinceById: jest
      .fn()
      .mockResolvedValue({ id: 'p', name: 'Santa Fe', countryId: 'ar' }),
    findLocalityById: jest
      .fn()
      .mockResolvedValue({ id: 'l', provinceId: 'p', name: 'Rosario' }),
    findNeighborhoodById: jest
      .fn()
      .mockResolvedValue({ id: 'b', localityId: 'l', name: 'Centro' }),
    findCountryById: jest.fn().mockResolvedValue({ iso2: 'AR' }),
  };
  const properties = {
    findById: jest.fn().mockResolvedValue({ id: 'property', tenantId: 't' }),
  };
  const access = {
    assertCanEditProperty: jest.fn().mockResolvedValue(undefined),
  };
  const provider = {
    search: jest
      .fn()
      .mockResolvedValue({ status: 'NO_RESULTS', candidates: [] }),
  };
  return {
    service: new PropertyLocationSearchService(
      geo as never,
      properties as never,
      access as never,
      provider,
    ),
    geo,
    properties,
    access,
    provider,
  };
}
describe('property location lookup authorization and boundaries', () => {
  it('constructs a canonical address from IDs, excluding extraneous private fields', async () => {
    const h = setup();
    await h.service.search(
      {
        ...dto,
        neighborhoodId: 'b',
        postalCode: '2000',
        province: 'spoof',
        city: 'spoof',
        neighborhood: 'spoof',
      },
      't',
      user,
    );
    expect(h.provider.search).toHaveBeenCalledWith(
      'Calle Falsa 123, Centro, Rosario, Santa Fe, 2000, Argentina',
      '123',
    );
    expect(h.properties.findById).not.toHaveBeenCalled();
  });
  it('handles CABA where barrio is a locality, without duplicating barrio', async () => {
    const h = setup();
    h.geo.findProvinceById.mockResolvedValue({
      id: 'p',
      name: 'Capital Federal',
      countryId: 'ar',
    });
    h.geo.findLocalityById.mockResolvedValue({
      id: 'l',
      provinceId: 'p',
      name: 'Palermo',
    });
    await h.service.search(dto, 't', user);
    expect(h.provider.search).toHaveBeenCalledWith(
      'Calle Falsa 123, Palermo, Ciudad Autónoma de Buenos Aires, Argentina',
      '123',
    );
  });
  it.each([
    { ...dto, street: '' },
    { ...dto, provinceId: undefined },
    { ...dto, localityId: 'foreign' },
    { ...dto, country: 'UY' as 'AR' },
  ])(
    'rejects incomplete or invalid address without provider call',
    async (input) => {
      const h = setup();
      if (input.localityId === 'foreign')
        h.geo.findLocalityById.mockResolvedValue({
          id: 'foreign',
          provinceId: 'other',
          name: 'Rosario',
        });
      await expect(h.service.search(input, 't', user)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(h.provider.search).not.toHaveBeenCalled();
    },
  );
  it('enforces property-scoped edit access before calling Geo or provider', async () => {
    const h = setup();
    h.access.assertCanEditProperty.mockRejectedValue(new ForbiddenException());
    await expect(
      h.service.search(dto, 't', user, 'property'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(h.provider.search).not.toHaveBeenCalled();
    expect(h.geo.findProvinceById).not.toHaveBeenCalled();
    h.properties.findById.mockResolvedValue(null);
    await expect(
      h.service.search(dto, 't', user, 'foreign'),
    ).rejects.toMatchObject({ status: 404 });
    expect(h.properties.findById).toHaveBeenCalledWith('foreign', 't');
  });
  it('blocks cross-tenant identity and RealData before any lookup', async () => {
    const h = setup();
    await expect(h.service.search(dto, 'other', user)).rejects.toMatchObject({
      status: 404,
    });
    const old = process.env.VALORAR_DATABASE_ENV;
    try {
      process.env.VALORAR_DATABASE_ENV = 'realdata';
      await expect(h.service.search(dto, 't', user)).rejects.toMatchObject({
        status: 404,
      });
    } finally {
      if (old === undefined) delete process.env.VALORAR_DATABASE_ENV;
      else process.env.VALORAR_DATABASE_ENV = old;
    }
    expect(h.provider.search).not.toHaveBeenCalled();
  });
  it('limits bursts per user and returns retry timing without accessing the provider', async () => {
    const h = setup();
    for (let i = 0; i < 5; i++) await h.service.search(dto, 't', user);
    await expect(h.service.search(dto, 't', user)).rejects.toMatchObject({
      status: 429,
    });
    expect(h.provider.search).toHaveBeenCalledTimes(5);
  });
});
