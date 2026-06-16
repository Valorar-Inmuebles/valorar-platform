import type { PropertyListingType } from "@repo/shared-types";

export type PropertyListingStatus =
  | "DRAFT"
  | "ACTIVE"
  | "PAUSED"
  | "RESERVED"
  | "CLOSED";

export type ListingCurrency = "ARS" | "USD";

export type AdminPropertyListing = {
  id: string;
  tenantId: string;
  propertyId: string;
  listingType: PropertyListingType;
  status: PropertyListingStatus;
  expensesAmount: number | null;
  expensesCurrency: ListingCurrency | null;
  isFeatured: boolean;
  publishedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreatePropertyListingPayload = {
  listingType: PropertyListingType;
  expensesAmount?: number;
  expensesCurrency?: ListingCurrency;
  isFeatured?: boolean;
};

export type UpdatePropertyListingPayload = {
  status?: PropertyListingStatus;
  expensesAmount?: number;
  expensesCurrency?: ListingCurrency;
  isFeatured?: boolean;
};

export type PropertyListingFormValues = {
  listingType: PropertyListingType | "";
  expensesAmount: string;
  expensesCurrency: ListingCurrency | "";
  isFeatured: boolean;
  status: PropertyListingStatus | "";
};
