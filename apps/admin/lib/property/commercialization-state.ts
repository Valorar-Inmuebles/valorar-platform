import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { ListingPublishability } from "@/lib/property/publishability";

export function mergeListingUpdate(
  listings: AdminPropertyListing[],
  listing: AdminPropertyListing,
): AdminPropertyListing[] {
  return listings.map((current) =>
    current.id === listing.id ? listing : current,
  );
}

export function mergeListingClose(
  listings: AdminPropertyListing[],
  listing: AdminPropertyListing,
): AdminPropertyListing[] {
  return mergeListingUpdate(listings, listing);
}

export function mergeListingPrices(
  pricesByListingId: Record<string, AdminPropertyPrice[]>,
  listingId: string,
  prices: AdminPropertyPrice[],
): Record<string, AdminPropertyPrice[]> {
  return {
    ...pricesByListingId,
    [listingId]: prices,
  };
}

export function mergeListingPublishability(
  publishabilityByListingId: Record<string, ListingPublishability>,
  publishability: ListingPublishability,
): Record<string, ListingPublishability> {
  return {
    ...publishabilityByListingId,
    [publishability.listingId]: publishability,
  };
}

export function applyListingMutation(
  listings: AdminPropertyListing[],
  publishabilityByListingId: Record<string, ListingPublishability>,
  listing: AdminPropertyListing,
  publishability: ListingPublishability,
) {
  return {
    listings: mergeListingUpdate(listings, listing),
    publishabilityByListingId: mergeListingPublishability(
      publishabilityByListingId,
      publishability,
    ),
  };
}

export function applyListingPricesMutation(
  pricesByListingId: Record<string, AdminPropertyPrice[]>,
  publishabilityByListingId: Record<string, ListingPublishability>,
  listingId: string,
  prices: AdminPropertyPrice[],
  publishability: ListingPublishability,
) {
  return {
    pricesByListingId: mergeListingPrices(pricesByListingId, listingId, prices),
    publishabilityByListingId: mergeListingPublishability(
      publishabilityByListingId,
      publishability,
    ),
  };
}
