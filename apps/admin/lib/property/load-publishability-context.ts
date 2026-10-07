import { getPropertyDetailContext } from "@/lib/api/property-detail-context";
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
  const { property, operations } = await getPropertyDetailContext(propertyId);
  const listings = operations.map(({ listing }) => listing);
  const publishabilityEntries = operations.map(
    ({ listing, publishability }) =>
      [
        listing.id,
        mapApiPublishabilityToListing(property, listing, publishability),
      ] as const,
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
