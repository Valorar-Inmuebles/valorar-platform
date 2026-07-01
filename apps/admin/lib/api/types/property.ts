import type {
  Orientation,
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
  PropertyType,
} from "@repo/shared-types";

export type {
  Orientation,
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
};

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
  countryId: string | null;
  provinceId: string | null;
  localityId: string | null;
  neighborhoodId: string | null;
  provinceName: string | null;
  localityName: string | null;
  neighborhoodName: string | null;
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
  orientation: Orientation | null;
  layout: PropertyLayout | null;
  brightness: PropertyBrightness | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyPayload = {
  slug: string;
  title: string;
  propertyType: PropertyType;
  city?: string;
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
  countryId?: string;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string | null;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  rooms?: number;
  bedrooms?: number;
  bathrooms?: number;
  halfBathrooms?: number;
  parkingSpaces?: number;
  totalArea?: number;
  coveredArea?: number;
  uncoveredArea?: number;
  lotFront?: number;
  lotDepth?: number;
  yearBuilt?: number;
  orientation?: Orientation;
  layout?: PropertyLayout;
  brightness?: PropertyBrightness;
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
  floor: string;
  apartment: string;
  neighborhood: string;
  province: string;
  countryId: string;
  provinceId: string;
  localityId: string;
  neighborhoodId: string;
  provinceName: string;
  localityName: string;
  neighborhoodName: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  rooms: string;
  bedrooms: string;
  bathrooms: string;
  halfBathrooms: string;
  parkingSpaces: string;
  totalArea: string;
  coveredArea: string;
  uncoveredArea: string;
  lotFront: string;
  lotDepth: string;
  yearBuilt: string;
  orientation: Orientation | "";
  layout: PropertyLayout | "";
  brightness: PropertyBrightness | "";
  isActive: boolean;
};
