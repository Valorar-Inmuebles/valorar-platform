import type { PropertyType } from "@repo/shared-types";

export type PropertyCondition =
  | "NEW"
  | "EXCELLENT"
  | "VERY_GOOD"
  | "GOOD"
  | "REGULAR"
  | "TO_RENOVATE"
  | "UNDER_CONSTRUCTION";

export type AdminProperty = {
  id: string;
  tenantId: string;
  createdById: string;
  slug: string;
  internalCode: string | null;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  condition: PropertyCondition | null;
  isActive: boolean;
  street: string | null;
  streetNumber: string | null;
  floor: string | null;
  apartment: string | null;
  neighborhood: string | null;
  city: string;
  province: string | null;
  state: string | null;
  country: string;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
  totalArea: number | null;
  coveredArea: number | null;
  uncoveredArea: number | null;
  lotFront: number | null;
  lotDepth: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  halfBathrooms: number | null;
  parkingSpaces: number | null;
  yearBuilt: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyPayload = {
  slug: string;
  title: string;
  propertyType: PropertyType;
  city: string;
  description?: string;
  internalCode?: string;
  condition?: PropertyCondition;
  isActive?: boolean;
  street?: string;
  streetNumber?: string;
  floor?: string;
  apartment?: string;
  neighborhood?: string;
  province?: string;
  country?: string;
  postalCode?: string;
  bedrooms?: number;
  bathrooms?: number;
  totalArea?: number;
  coveredArea?: number;
};

export type UpdatePropertyPayload = Partial<
  Omit<CreatePropertyPayload, "slug"> & { slug: string }
>;

export type PropertyFormValues = {
  title: string;
  slug: string;
  propertyType: PropertyType | "";
  city: string;
  description: string;
  internalCode: string;
  condition: PropertyCondition | "";
  street: string;
  streetNumber: string;
  neighborhood: string;
  province: string;
  postalCode: string;
  bedrooms: string;
  bathrooms: string;
  totalArea: string;
  coveredArea: string;
  isActive: boolean;
};
