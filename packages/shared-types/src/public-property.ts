export type Currency = "ARS" | "USD";

export type PropertyListingType = "SALE" | "RENT" | "TEMPORARY_RENT";

export type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "PH"
  | "OFFICE"
  | "COMMERCIAL"
  | "WAREHOUSE"
  | "INDUSTRIAL"
  | "LAND"
  | "FIELD"
  | "GARAGE"
  | "COUNTRY_HOUSE"
  | "OTHER";

export type PublicCoverImage = {
  url: string | null;
  storageKey: string;
  altText: string | null;
};

export type PublicPropertyCard = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  city: string;
  neighborhood: string | null;
  coverImage: PublicCoverImage;
  price: number;
  currency: Currency;
  bedrooms: number | null;
  bathrooms: number | null;
  totalArea: number | null;
  listingType: PropertyListingType;
};

export type PublicPropertyListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicPropertyListResponse = {
  data: PublicPropertyCard[];
  meta: PublicPropertyListMeta;
};
