import { buildDevelopmentLocationWhere } from './development-location-filters';

describe('buildDevelopmentLocationWhere', () => {
  it('filters by canonical locality name when neighborhood text is provided', () => {
    expect(buildDevelopmentLocationWhere({ neighborhood: 'Palermo' })).toEqual({
      OR: [
        { neighborhood: { equals: 'Palermo', mode: 'insensitive' } },
        {
          geoNeighborhood: {
            search: { contains: 'palermo', mode: 'insensitive' },
          },
        },
        {
          geoLocality: {
            search: { contains: 'palermo', mode: 'insensitive' },
          },
        },
        {
          geoLocality: {
            name: { equals: 'Palermo', mode: 'insensitive' },
          },
        },
      ],
    });
  });

  it('prefers localityId over city text when both are absent except localityId', () => {
    expect(buildDevelopmentLocationWhere({ localityId: 'locality-1' })).toEqual(
      {
        localityId: 'locality-1',
      },
    );
  });

  it('combines province and neighborhood filters with AND', () => {
    expect(
      buildDevelopmentLocationWhere({
        provinceId: 'province-1',
        neighborhood: 'Flores',
      }),
    ).toEqual({
      AND: [
        { provinceId: 'province-1' },
        {
          OR: [
            { neighborhood: { equals: 'Flores', mode: 'insensitive' } },
            {
              geoNeighborhood: {
                search: { contains: 'flores', mode: 'insensitive' },
              },
            },
            {
              geoLocality: {
                search: { contains: 'flores', mode: 'insensitive' },
              },
            },
            {
              geoLocality: {
                name: { equals: 'Flores', mode: 'insensitive' },
              },
            },
          ],
        },
      ],
    });
  });
});
