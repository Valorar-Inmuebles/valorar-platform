export type Currency = "ARS" | "USD";

export type PropertyListingType = "SALE" | "RENT" | "TEMPORARY_RENT";

export type PropertyFeatureCategory =
  | "GENERAL"
  | "SERVICE"
  | "ROOM"
  | "AMENITY";

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

export type PublicPropertyImage = {
  id: string;
  url: string | null;
  storageKey: string;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type PublicPropertyPrimaryPrice = {
  amount: number;
  currency: Currency;
  label: string | null;
};

export type PublicPropertyListing = {
  id: string;
  listingType: PropertyListingType;
  isFeatured: boolean;
  publishedAt: string | null;
  expensesAmount: number | null;
  expensesCurrency: Currency | null;
  primaryPrice: PublicPropertyPrimaryPrice;
};

export type PublicPropertyFeature = {
  id: string;
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  value: string | null;
};

export type PublicPropertyDetail = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  city: string;
  neighborhood: string | null;
  province: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  totalArea: number | null;
  coverImage: PublicCoverImage;
  price: PublicPropertyPrimaryPrice;
  listingType: PropertyListingType;
  listing: PublicPropertyListing;
  gallery: PublicPropertyImage[];
  features: PublicPropertyFeature[];
  availableListingTypes: PropertyListingType[];
};

export type GeocodeSource = "MANUAL" | "GOOGLE_PLACES" | "IMPORT";

export type GeocodeAccuracy =
  | "EXACT"
  | "APPROXIMATE"
  | "NEIGHBORHOOD"
  | "CITY";
