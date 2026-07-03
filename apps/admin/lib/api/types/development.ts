import type { DevelopmentStatus } from "@repo/shared-types";

export type PriceCurrency = "ARS" | "USD";

export type AdminDevelopment = {
  id: string;
  tenantId: string;
  createdById: string;
  slug: string;
  internalCode: string | null;
  title: string;
  shortDescription: string;
  description: string;
  status: DevelopmentStatus | null;
  isActive: boolean;
  street: string | null;
  streetNumber: string | null;
  neighborhood: string | null;
  city: string;
  province: string | null;
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
  googlePlaceId: string | null;
  formattedAddress: string | null;
  priceFrom: number | null;
  currency: PriceCurrency | null;
  hasFinancing: boolean;
  financingDescription: string | null;
  hasParkingSpaces: boolean;
  parkingSpacesCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateDevelopmentPayload = {
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  status?: DevelopmentStatus;
  internalCode?: string;
  isActive?: boolean;
  street?: string;
  streetNumber?: string;
  neighborhood?: string;
  city?: string;
  countryId?: string;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string | null;
  province?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
  hasParkingSpaces?: boolean;
  parkingSpacesCount?: number | null;
};

export type UpdateDevelopmentPayload = Partial<
  Omit<CreateDevelopmentPayload, "status"> & {
    status?: DevelopmentStatus | null;
    priceFrom?: number | null;
    currency?: PriceCurrency | null;
    hasFinancing?: boolean;
    financingDescription?: string | null;
    hasParkingSpaces?: boolean;
    parkingSpacesCount?: number | null;
  }
>;

export type DevelopmentFormValues = {
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  status: DevelopmentStatus | "";
  internalCode: string;
  street: string;
  streetNumber: string;
  neighborhood: string;
  province: string;
  countryId: string;
  provinceId: string;
  localityId: string;
  neighborhoodId: string;
  provinceName: string;
  localityName: string;
  neighborhoodName: string;
  city: string;
  postalCode: string;
  latitude: string;
  longitude: string;
  isActive: boolean;
  hasParkingSpaces: "yes" | "no";
  parkingSpacesCount: string;
};

export type DevelopmentCommercializationFormValues = {
  priceFrom: string;
  currency: PriceCurrency | "";
  hasFinancing: "yes" | "no";
  financingDescription: string;
};
