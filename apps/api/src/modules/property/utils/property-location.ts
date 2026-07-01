import {
  Country,
  Locality,
  Neighborhood,
  Property,
  Province,
} from '../../../../generated/prisma/client';

export type PropertyWithGeoRelations = Property & {
  geoCountry?: Country | null;
  geoProvince?: Province | null;
  geoLocality?: Locality | null;
  geoNeighborhood?: Neighborhood | null;
};

export type ResolvedPropertyLocation = {
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

export function resolvePropertyLocation(
  property: PropertyWithGeoRelations,
): ResolvedPropertyLocation {
  const provinceName =
    property.geoProvince?.name ?? property.province ?? null;
  const localityName = property.geoLocality?.name ?? property.city;
  const neighborhoodName =
    property.geoNeighborhood?.name ?? property.neighborhood ?? null;

  return {
    countryId: property.countryId,
    provinceId: property.provinceId,
    localityId: property.localityId,
    neighborhoodId: property.neighborhoodId,
    countryName: property.geoCountry?.name ?? property.country,
    provinceName,
    localityName,
    neighborhoodName,
    city: localityName,
    province: provinceName,
    neighborhood: neighborhoodName,
    country: property.geoCountry?.iso2 ?? property.country,
  };
}

export const propertyGeoInclude = {
  geoCountry: true,
  geoProvince: true,
  geoLocality: true,
  geoNeighborhood: true,
} as const;
