import type { Currency, PropertyFeatureCategory, PublicCoverImage } from "./public-property";
import type { PropertyGeoFields } from "./geo";

export type DevelopmentStatus = "IN_PIT" | "UNDER_CONSTRUCTION" | "COMPLETED";

export type PublicDevelopmentImage = {
  id: string;
  url: string | null;
  altText: string | null;
  sortOrder: number;
  isCover: boolean;
};

export type { PublicCoverImage };

export type PublicDevelopmentFeature = {
  id: string;
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  value: string | null;
};

export type PublicDevelopmentTypologyFeature = {
  id: string;
  name: string;
  slug: string;
  category: PropertyFeatureCategory;
  value: string | null;
};

export type PublicDevelopmentTypology = {
  id: string;
  name: string;
  description: string;
  totalCount: number | null;
  availableCount: number | null;
  surfaceFrom: number | null;
  surfaceTo: number | null;
  priceFrom: number | null;
  currency: Currency | null;
  features: PublicDevelopmentTypologyFeature[];
};

export type PublicDevelopmentCard = PropertyGeoFields & {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  status: DevelopmentStatus | null;
  city: string;
  province: string | null;
  neighborhood: string | null;
  coverImage: PublicCoverImage;
  priceFrom: number | null;
  currency: Currency | null;
};

export type PublicDevelopmentDetail = PublicDevelopmentCard & {
  description: string;
  street: string | null;
  streetNumber: string | null;
  latitude: number | null;
  longitude: number | null;
  hasFinancing: boolean;
  financingDescription: string | null;
  hasParkingSpaces: boolean;
  parkingSpacesCount: number | null;
  images: PublicDevelopmentImage[];
  features: PublicDevelopmentFeature[];
  typologies: PublicDevelopmentTypology[];
};

export type PublicDevelopmentListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PublicDevelopmentListResponse = {
  data: PublicDevelopmentCard[];
  meta: PublicDevelopmentListMeta;
};
