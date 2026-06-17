import { apiFetch } from "@/lib/api/client";
import type { PropertyPublishabilitySummaryItem } from "@/lib/api/types/property-publishability-summary";

export async function getPropertiesPublishabilitySummary(): Promise<
  PropertyPublishabilitySummaryItem[]
> {
  return apiFetch<PropertyPublishabilitySummaryItem[]>(
    "/properties/publishability-summary",
    { cache: "no-store" },
  );
}
