import { getPropertyPublishability } from "@/lib/api/property-publishability";
import { getProperty } from "@/lib/api/property";
import { listPropertyListings } from "@/lib/api/property-listing";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import {
  buildPropertyPublishabilitySummary,
  mapApiPublishabilityToListing,
  type ListingPublishability,
  type PropertyPublishabilitySummary,
} from "@/lib/property/publishability";

export type PropertyPublishabilityContext = {
  property: AdminProperty;
  listings: AdminPropertyListing[];
  summary: PropertyPublishabilitySummary;
  publishabilityByListingId: Record<string, ListingPublishability>;
};

export async function loadPropertyPublishabilityContext(
  propertyId: string,
): Promise<PropertyPublishabilityContext> {
  const [property, listings] = await Promise.all([
    getProperty(propertyId),
    listPropertyListings({ propertyId }),
  ]);

  const publishabilityEntries = await Promise.all(
    listings.map(async (listing) => {
      const api = await getPropertyPublishability(propertyId, listing.id);
      return [
        listing.id,
        mapApiPublishabilityToListing(property, listing, api),
      ] as const;
    }),
  );

  const publishabilityByListingId = Object.fromEntries(publishabilityEntries);

  return {
    property,
    listings,
    publishabilityByListingId,
    summary: buildPropertyPublishabilitySummary(
      property,
      listings,
      publishabilityByListingId,
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
