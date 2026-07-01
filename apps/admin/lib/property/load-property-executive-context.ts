import { listPropertyFeatureAssignments } from "@/lib/api/property-feature-assignment";
import { listPropertyImages } from "@/lib/api/property-image";
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
  const [commercial, images, features] = await Promise.all([
    loadCommercializationContext(propertyId),
    listPropertyImages(propertyId),
    listPropertyFeatureAssignments(propertyId),
  ]);

  const snapshot = buildPropertyExecutiveSnapshot({
    property: commercial.property,
    publishability: commercial.summary,
    listings: commercial.listings,
    pricesByListingId: commercial.pricesByListingId,
    imageCount: images.length,
    hasCoverImage: images.some((image) => image.isCover),
    featureCount: features.length,
  });

  return {
    property: commercial.property,
    publishability: commercial.summary,
    snapshot,
  };
}
