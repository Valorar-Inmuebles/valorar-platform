import { Prisma } from '../../../../generated/prisma/client';
import { createSearch } from '@repo/geo-text';

export type DevelopmentLocationFilters = {
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  city?: string;
  neighborhood?: string;
};

export function buildDevelopmentLocationWhere(
  filters: DevelopmentLocationFilters,
): Prisma.DevelopmentWhereInput {
  const conditions: Prisma.DevelopmentWhereInput[] = [];

  if (filters.provinceId) {
    conditions.push({ provinceId: filters.provinceId });
  }

  if (filters.localityId) {
    conditions.push({ localityId: filters.localityId });
  } else if (filters.city) {
    const citySearch = createSearch(filters.city);
    conditions.push({
      OR: [
        { city: { equals: filters.city, mode: 'insensitive' } },
        {
          geoLocality: {
            search: { contains: citySearch, mode: 'insensitive' },
          },
        },
        {
          geoLocality: { name: { equals: filters.city, mode: 'insensitive' } },
        },
      ],
    });
  }

  if (filters.neighborhoodId) {
    conditions.push({ neighborhoodId: filters.neighborhoodId });
  } else if (filters.neighborhood) {
    const neighborhoodSearch = createSearch(filters.neighborhood);
    conditions.push({
      OR: [
        { neighborhood: { equals: filters.neighborhood, mode: 'insensitive' } },
        {
          geoNeighborhood: {
            search: { contains: neighborhoodSearch, mode: 'insensitive' },
          },
        },
        {
          geoLocality: {
            search: { contains: neighborhoodSearch, mode: 'insensitive' },
          },
        },
        {
          geoLocality: {
            name: { equals: filters.neighborhood, mode: 'insensitive' },
          },
        },
      ],
    });
  }

  if (conditions.length === 0) {
    return {};
  }

  if (conditions.length === 1) {
    return conditions[0];
  }

  return { AND: conditions };
}
