import type { PropertyListingType, PropertyType } from "./public-property";
import type { PaginatedResponse } from "./rental-communications";

export type PropertyCommercialStatus =
  | "published"
  | "commercial-draft"
  | "archived";

export type PropertyListItem = {
  id: string;
  slug: string;
  title: string;
  internalCode: string | null;
  propertyType: PropertyType;
  isActive: boolean;
  location: { localityName: string; neighborhoodName: string | null };
  listingTypes: PropertyListingType[];
  statusVariant: PropertyCommercialStatus;
  isAnyPublishable: boolean;
  publicUrl: string | null;
  activeListingsCount: number;
  createdBy: {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
  } | null;
  capabilities: { canEdit: boolean; canArchive: boolean; canRestore: boolean };
};

export type PropertyListResponse = PaginatedResponse<PropertyListItem> & {
  commercialCounts: {
    all: number;
    active: number;
    published: number;
    commercialDraft: number;
    archived: number;
  };
};
