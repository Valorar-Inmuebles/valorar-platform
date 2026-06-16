import { listPropertyImages } from "@/lib/api/property-image";
import { listPropertyListings } from "@/lib/api/property-listing";
import { listPropertyPrices } from "@/lib/api/property-price";
import { getProperty } from "@/lib/api/property";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyImage } from "@/lib/api/types/property-image";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import {
  buildPropertyPublishabilitySummary,
  type PropertyPublishabilitySummary,
} from "@/lib/property/publishability";

export type PropertyPublishabilityContext = {
  property: AdminProperty;
  listings: AdminPropertyListing[];
  images: AdminPropertyImage[];
  summary: PropertyPublishabilitySummary;
};

async function loadPricesByListingId(
  listingIds: string[],
): Promise<Record<string, AdminPropertyPrice[]>> {
  const entries = await Promise.all(
    listingIds.map(async (listingId) => {
      const prices = await listPropertyPrices(listingId);
      return [listingId, prices] as const;
    }),
  );

  return Object.fromEntries(entries);
}

export async function loadPropertyPublishabilityContext(
  propertyId: string,
): Promise<PropertyPublishabilityContext> {
  const [property, listings, images] = await Promise.all([
    getProperty(propertyId),
    listPropertyListings({ propertyId }),
    listPropertyImages(propertyId),
  ]);

  const pricesByListingId = await loadPricesByListingId(
    listings.map((listing) => listing.id),
  );

  return {
    property,
    listings,
    images,
    summary: buildPropertyPublishabilitySummary(
      property,
      listings,
      pricesByListingId,
      images,
    ),
  };
}

/** @deprecated Use loadPropertyPublishabilityContext */
export async function loadPropertyPublishability(
  propertyId: string,
): Promise<PropertyPublishabilitySummary> {
  const context = await loadPropertyPublishabilityContext(propertyId);
  return context.summary;
}
