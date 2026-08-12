import {
  findExplicitLocalityMapping,
  HOUZEZ_EXPLICIT_LOCALITY_MAPPINGS,
} from './explicit-locality-mappings';
import { resolveCatalogsForTransform } from './resolve-catalogs';
import type { PublishTransformResult } from '../transform/publish-rules';
import { evaluateCatalogLocalityGate } from './assert-resolved-locality';

function baseTransform(
  over: Partial<PublishTransformResult['property']> = {},
): PublishTransformResult {
  return {
    property: {
      title: 'x',
      slug: 'x',
      description: null,
      propertyType: 'APARTMENT',
      isActive: true,
      city: 'CABA',
      province: 'Ciudad Autónoma de Buenos Aires',
      country: 'AR',
      neighborhood: 'Flores',
      street: null,
      streetNumber: null,
      latitude: null,
      longitude: null,
      geocodeSource: null,
      totalArea: 40,
      coveredArea: null,
      rooms: 2,
      bedrooms: 1,
      bathrooms: 1,
      halfBathrooms: null,
      parkingSpaces: null,
      internalCode: 'VL-1',
      ...over,
    },
    listing: { listingType: 'SALE', status: 'ACTIVE' },
    price: { amount: 100000, currency: 'USD', isPrimary: true },
    featureNames: [],
    inferences: [],
    warnings: [],
    blockers: [],
  };
}

describe('explicit locality mappings', () => {
  it('resolves Parque Avellaneda and Ramos Mejía keys', () => {
    expect(
      findExplicitLocalityMapping('Parque Avellaneda')?.provinceScope,
    ).toBe('capital-federal');
    expect(findExplicitLocalityMapping('Ramos Mejía')?.provinceScope).toBe(
      'buenos-aires',
    );
    expect(findExplicitLocalityMapping('Ramos Mejia')?.localitySearch).toBe(
      'ramosmejia',
    );
    expect(findExplicitLocalityMapping('Lanús')).toBeNull();
    expect(HOUZEZ_EXPLICIT_LOCALITY_MAPPINGS).toHaveLength(2);
  });
});

describe('resolveCatalogsForTransform explicit mappings', () => {
  const caba = {
    id: 'p-caba',
    name: 'Capital Federal',
    search: 'capitalfederal',
    countryId: 'c-ar',
    slug: 'capital-federal',
  };
  const ba = {
    id: 'p-ba',
    name: 'Buenos Aires',
    search: 'buenosaires',
    countryId: 'c-ar',
    slug: 'buenos-aires',
  };

  function mockPrisma(opts: {
    localities: Array<{
      id: string;
      name: string;
      search: string;
      provinceId: string;
      slug: string;
    }>;
  }) {
    return {
      country: {
        findFirst: () =>
          Promise.resolve({ id: 'c-ar', name: 'Argentina', iso2: 'AR' }),
      },
      province: {
        findMany: () => Promise.resolve([caba, ba]),
      },
      locality: {
        findMany: (args: { where?: { provinceId?: string } }) =>
          Promise.resolve(
            opts.localities.filter(
              (l) => l.provinceId === args.where?.provinceId,
            ),
          ),
      },
      propertyFeature: {
        findMany: () => Promise.resolve([]),
      },
    };
  }

  it('resolves Parque Avellaneda under CABA via explicit mapping', async () => {
    const prisma = mockPrisma({
      localities: [
        {
          id: 'loc-paq',
          name: 'Parque Avellaneda',
          search: 'parqueavellaneda',
          provinceId: caba.id,
          slug: 'parque-avellaneda',
        },
      ],
    });
    const catalogs = await resolveCatalogsForTransform({
      prisma,
      transform: baseTransform({
        neighborhood: 'Parque Avellaneda',
        city: 'CABA',
      }),
    });
    const locality = catalogs.find((c) => c.key === 'localityId');
    const province = catalogs.find((c) => c.key === 'provinceId');
    expect(province?.status).toBe('resolved');
    expect((province?.value as { id: string }).id).toBe(caba.id);
    expect(locality?.status).toBe('resolved');
    expect((locality?.value as { slug: string }).slug).toBe(
      'parque-avellaneda',
    );
    expect(evaluateCatalogLocalityGate(catalogs).ok).toBe(true);
  });

  it('resolves Ramos Mejía under Buenos Aires via explicit mapping only', async () => {
    const prisma = mockPrisma({
      localities: [
        {
          id: 'loc-ramos',
          name: 'Ramos mejia',
          search: 'ramosmejia',
          provinceId: ba.id,
          slug: 'ramos-mejia',
        },
        {
          id: 'loc-lanus',
          name: 'Lanus',
          search: 'lanus',
          provinceId: ba.id,
          slug: 'lanus',
        },
      ],
    });
    const catalogs = await resolveCatalogsForTransform({
      prisma,
      transform: baseTransform({
        neighborhood: 'Ramos Mejia',
        city: 'Gran Buenos Aires',
        province: null,
      }),
    });
    const locality = catalogs.find((c) => c.key === 'localityId');
    const province = catalogs.find((c) => c.key === 'provinceId');
    expect((province?.value as { id: string }).id).toBe(ba.id);
    expect(locality?.status).toBe('resolved');
    expect((locality?.value as { slug: string }).slug).toBe('ramos-mejia');
    expect(evaluateCatalogLocalityGate(catalogs).ok).toBe(true);
  });

  it('blocks unmapped GBA locality (Lanús) without enabling full GBA', async () => {
    const prisma = mockPrisma({
      localities: [
        {
          id: 'loc-lanus',
          name: 'Lanus',
          search: 'lanus',
          provinceId: ba.id,
          slug: 'lanus',
        },
      ],
    });
    const catalogs = await resolveCatalogsForTransform({
      prisma,
      transform: baseTransform({
        neighborhood: 'Lanús',
        city: 'Gran Buenos Aires',
      }),
    });
    // Default path still looks under CABA only — Lanús will not match there.
    const locality = catalogs.find((c) => c.key === 'localityId');
    expect(locality?.status).toBe('unresolved');
    expect(evaluateCatalogLocalityGate(catalogs).ok).toBe(false);
  });
});
