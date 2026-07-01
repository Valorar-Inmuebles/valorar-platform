export type GeoProvince = {
  id: string;
  name: string;
  slug: string;
  isoCode: string | null;
};

export type GeoLocality = {
  id: string;
  provinceId: string;
  name: string;
  slug: string;
  postalCode: string | null;
};

export type GeoLocalitySearchResult = GeoLocality & {
  provinceName: string;
};

export type GeoNeighborhood = {
  id: string;
  localityId: string;
  name: string;
  slug: string;
};

export type PropertyGeoFields = {
  provinceId: string | null;
  provinceName: string | null;
  localityId: string | null;
  localityName: string | null;
  neighborhoodId: string | null;
  neighborhoodName: string | null;
};
