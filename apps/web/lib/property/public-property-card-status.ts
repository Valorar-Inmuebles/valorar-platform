import {
  getListingStatusLabel,
  type PropertyListingStatus,
  type PropertyListingType,
} from "@repo/shared-types";

export function getPublicPropertyCardStatusLabel(
  listingStatus: PropertyListingStatus,
  listingType: PropertyListingType,
): string | null {
  if (listingStatus !== "RESERVED" && listingStatus !== "CLOSED") {
    return null;
  }

  return getListingStatusLabel(listingStatus, listingType);
}
