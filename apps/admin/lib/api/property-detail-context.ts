import { cache } from "react";
import { apiFetch } from "@/lib/api/client";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import type { PropertyPublishabilityResponse } from "@/lib/api/types/property-publishability";

export type PropertyDetailContext = {
  property: AdminProperty;
  operations: {
    listing: AdminPropertyListing;
    prices: AdminPropertyPrice[];
    publishability: PropertyPublishabilityResponse;
  }[];
  imageCount: number;
  hasCoverImage: boolean;
  featureCount: number;
};

// React server-render scope only: never a cross-request/user/tenant data cache.
// Layout and tabs share this promise explicitly, independently of fetch deduplication.
export const getPropertyDetailContext = cache((id: string) =>
  apiFetch<PropertyDetailContext>(`/properties/${id}/detail-context`, {
    cache: "no-store",
  }),
);
