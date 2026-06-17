import type { AdminPropertyListing } from "@/lib/api/types/property-listing";

export type ActiveListingCountsByPropertyId = Record<string, number>;

export function buildActiveListingCountsByPropertyId(
  listings: AdminPropertyListing[],
): ActiveListingCountsByPropertyId {
  const counts: ActiveListingCountsByPropertyId = {};

  for (const listing of listings) {
    if (listing.status !== "ACTIVE") {
      continue;
    }

    counts[listing.propertyId] = (counts[listing.propertyId] ?? 0) + 1;
  }

  return counts;
}
