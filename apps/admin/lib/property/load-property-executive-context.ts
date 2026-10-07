import { getPropertyDetailContext } from "@/lib/api/property-detail-context";
import {
  buildPropertyExecutiveSnapshot,
  type PropertyExecutiveSnapshot,
} from "@/lib/property/property-executive";
import { loadCommercializationContext } from "@/lib/property/load-commercialization-context";
import type { PropertyPublishabilitySummary } from "@/lib/property/publishability";
import type { AdminProperty } from "@/lib/api/types/property";

export type PropertyExecutiveContext = {
  property: AdminProperty;
  publishability: PropertyPublishabilitySummary;
  snapshot: PropertyExecutiveSnapshot;
};

export async function loadPropertyExecutiveContext(
  propertyId: string,
): Promise<PropertyExecutiveContext> {
  const [commercial, detail] = await Promise.all([
    loadCommercializationContext(propertyId),
    getPropertyDetailContext(propertyId),
  ]);

  const snapshot = buildPropertyExecutiveSnapshot({
    property: commercial.property,
    publishability: commercial.summary,
    listings: commercial.listings,
    pricesByListingId: commercial.pricesByListingId,
    imageCount: detail.imageCount,
    hasCoverImage: detail.hasCoverImage,
    featureCount: detail.featureCount,
  });

  return {
    property: commercial.property,
    publishability: commercial.summary,
    snapshot,
  };
}
