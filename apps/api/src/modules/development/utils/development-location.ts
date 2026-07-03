import {
  Country,
  Development,
  Locality,
  Neighborhood,
  Province,
} from '../../../../generated/prisma/client';

export type DevelopmentWithGeoRelations = Development & {
  geoCountry?: Country | null;
  geoProvince?: Province | null;
  geoLocality?: Locality | null;
  geoNeighborhood?: Neighborhood | null;
};

export type ResolvedDevelopmentLocation = {
  countryId: string | null;
  provinceId: string | null;
  localityId: string | null;
  neighborhoodId: string | null;
  countryName: string;
  provinceName: string | null;
  localityName: string;
  neighborhoodName: string | null;
  city: string;
  province: string | null;
  neighborhood: string | null;
  country: string;
};

export function resolveDevelopmentLocation(
  development: DevelopmentWithGeoRelations,
): ResolvedDevelopmentLocation {
  const provinceName =
    development.geoProvince?.name ?? development.province ?? null;
  const localityName = development.geoLocality?.name ?? development.city;
  const neighborhoodName =
    development.geoNeighborhood?.name ?? development.neighborhood ?? null;

  return {
    countryId: development.countryId,
    provinceId: development.provinceId,
    localityId: development.localityId,
    neighborhoodId: development.neighborhoodId,
    countryName: development.geoCountry?.name ?? development.country,
    provinceName,
    localityName,
    neighborhoodName,
    city: localityName,
    province: provinceName,
    neighborhood: neighborhoodName,
    country: development.geoCountry?.iso2 ?? development.country,
  };
}

export const developmentGeoInclude = {
  geoCountry: true,
  geoProvince: true,
  geoLocality: true,
  geoNeighborhood: true,
} as const;
