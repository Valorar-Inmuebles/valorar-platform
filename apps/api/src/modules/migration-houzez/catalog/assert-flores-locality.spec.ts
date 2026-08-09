import {
  catalogsIncludeExactFlores,
  resolveExactFloresLocality,
  type FloresLocalityPrisma,
} from './assert-flores-locality';

function makePrisma(overrides?: {
  country?: { id: string; iso2: string } | null;
  provinces?: Array<{
    id: string;
    name: string;
    search: string;
    countryId: string;
  }>;
  localities?: Array<{
    id: string;
    name: string;
    slug: string;
    provinceId: string;
  }>;
}): FloresLocalityPrisma {
  const countryResolved: { id: string; iso2: string } | null =
    overrides && 'country' in overrides
      ? (overrides.country ?? null)
      : { id: 'country-ar', iso2: 'AR' };
  const provinces = overrides?.provinces ?? [
    {
      id: 'prov-caba',
      name: 'Ciudad Autónoma de Buenos Aires',
      search: 'capitalfederal',
      countryId: 'country-ar',
    },
  ];
  const localities = overrides?.localities ?? [
    {
      id: 'loc-flores',
      name: 'Flores',
      slug: 'flores',
      provinceId: 'prov-caba',
    },
  ];

  return {
    country: {
      findFirst: jest.fn(() => Promise.resolve(countryResolved)),
    },
    province: {
      findMany: jest.fn(() => Promise.resolve(provinces)),
    },
    locality: {
      findMany: jest.fn(() => Promise.resolve(localities)),
    },
  };
}

describe('resolveExactFloresLocality', () => {
  it('resolves exact slug=flores under CABA', async () => {
    const prisma = makePrisma();
    const result = await resolveExactFloresLocality(prisma);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.locality.slug).toBe('flores');
    expect(result.locality.id).toBe('loc-flores');
    expect(result.locality.provinceId).toBe('prov-caba');
    expect(result.locality.countryIso2).toBe('AR');

    expect(prisma.locality.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { provinceId: 'prov-caba', slug: 'flores' },
      }),
    );
  });

  it('fails when country AR is missing', async () => {
    const prisma = makePrisma({ country: null });
    const result = await resolveExactFloresLocality(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /Country AR/i.test(e))).toBe(true);
  });

  it('fails when CABA province is missing', async () => {
    const prisma = makePrisma({
      provinces: [
        {
          id: 'prov-ba',
          name: 'Buenos Aires',
          search: 'buenosaires',
          countryId: 'country-ar',
        },
      ],
    });
    const result = await resolveExactFloresLocality(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /CABA/i.test(e))).toBe(true);
  });

  it('fails when slug=flores is missing under CABA', async () => {
    const prisma = makePrisma({ localities: [] });
    const result = await resolveExactFloresLocality(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /slug=flores/i.test(e))).toBe(true);
  });

  it('fails when slug=flores is ambiguous', async () => {
    const prisma = makePrisma({
      localities: [
        {
          id: 'loc-1',
          name: 'Flores',
          slug: 'flores',
          provinceId: 'prov-caba',
        },
        {
          id: 'loc-2',
          name: 'Flores (dup)',
          slug: 'flores',
          provinceId: 'prov-caba',
        },
      ],
    });
    const result = await resolveExactFloresLocality(prisma);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => /Ambiguous/i.test(e))).toBe(true);
  });
});

describe('catalogsIncludeExactFlores', () => {
  it('returns true for resolved localityId with slug flores', () => {
    expect(
      catalogsIncludeExactFlores(
        [
          {
            key: 'localityId',
            status: 'resolved',
            detail: 'ok',
            value: { id: 'loc-flores', slug: 'flores', name: 'Flores' },
          },
        ],
        'loc-flores',
      ),
    ).toBe(true);
  });

  it('returns false when slug is not flores', () => {
    expect(
      catalogsIncludeExactFlores([
        {
          key: 'localityId',
          status: 'resolved',
          detail: 'ok',
          value: { id: 'loc-other', slug: 'palermo', name: 'Palermo' },
        },
      ]),
    ).toBe(false);
  });
});
