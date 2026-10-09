import {
  evaluateActivationChecklist,
  type PublicationCheckInput,
} from "@repo/property-rules";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { PropertyListingStatus } from "@/lib/api/types/property-listing";

export type ListingActivationFacts = Pick<
  PublicationCheckInput,
  "propertyIsActive" | "imageCount" | "hasCoverImage"
>;

export function listingActivationChecklist(
  facts: ListingActivationFacts,
  prices: AdminPropertyPrice[],
  selectedPrimaryId?: string | null,
) {
  return evaluateActivationChecklist({
    ...facts,
    listingStatus: "ACTIVE",
    hasPrimaryPrice:
      selectedPrimaryId === undefined
        ? prices.some((price) => price.isPrimary)
        : prices.some((price) => price.id === selectedPrimaryId),
  });
}

export function listingPublicationAction(status: PropertyListingStatus) {
  switch (status) {
    case "DRAFT":
      return { label: "Publicar", status: "ACTIVE" as const };
    case "PAUSED":
      return { label: "Reactivar publicación", status: "ACTIVE" as const };
    case "ACTIVE":
      return { label: "Pausar publicación", status: "PAUSED" as const };
    default:
      return null;
  }
}
