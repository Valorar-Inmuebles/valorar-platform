import { Prisma } from '../../../../generated/prisma/client';
import { createSearch } from '@repo/geo-text';

export type PropertyLocationFilters = {
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  city?: string;
  neighborhood?: string;
  province?: string;
};

export function buildPropertyLocationWhere(
  filters: PropertyLocationFilters,
): Prisma.PropertyWhereInput {
  const conditions: Prisma.PropertyWhereInput[] = [];

  if (filters.provinceId) {
    conditions.push({ provinceId: filters.provinceId });
  } else if (filters.province) {
    const provinceSearch = createSearch(filters.province);
    conditions.push({
      OR: [
        { province: { equals: filters.province, mode: 'insensitive' } },
        { geoProvince: { search: { contains: provinceSearch, mode: 'insensitive' } } },
      ],
    });
  }

  if (filters.localityId) {
    conditions.push({ localityId: filters.localityId });
  } else if (filters.city) {
    const citySearch = createSearch(filters.city);
    conditions.push({
      OR: [
        { city: { equals: filters.city, mode: 'insensitive' } },
        { geoLocality: { search: { contains: citySearch, mode: 'insensitive' } } },
        { geoLocality: { name: { equals: filters.city, mode: 'insensitive' } } },
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
    return conditions[0]!;
  }

  return { AND: conditions };
}
