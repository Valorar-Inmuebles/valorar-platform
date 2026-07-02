import type { PublicationCheckKey } from "@repo/property-rules";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { ListingPublishability } from "@/lib/property/publishability";

export type CommercializationMutationError = {
  ok: false;
  error: string;
  code?: "PUBLICATION_CHECKLIST_INCOMPLETE";
  missing?: PublicationCheckKey[];
};

export type ListingMutationSuccess = {
  ok: true;
  listing: AdminPropertyListing;
  publishability: ListingPublishability;
};

export type ListingPricesMutationSuccess = {
  ok: true;
  prices: AdminPropertyPrice[];
  publishability: ListingPublishability;
};

export type ListingMutationResult =
  | ListingMutationSuccess
  | CommercializationMutationError;

export type ListingPricesMutationResult =
  | ListingPricesMutationSuccess
  | CommercializationMutationError;
