import { apiFetch } from "@/lib/api/client";
import type { PropertyPublishabilityResponse } from "@/lib/api/types/property-publishability";

export async function getPropertyPublishability(
  propertyId: string,
  listingId: string,
): Promise<PropertyPublishabilityResponse> {
  const params = new URLSearchParams({ listingId });

  return apiFetch<PropertyPublishabilityResponse>(
    `/properties/${propertyId}/publishability?${params.toString()}`,
    { cache: "no-store" },
  );
}
