import { apiFetch } from "@/lib/api/client";
import type {
  DashboardSummary,
  DashboardSummaryResponse,
} from "@/lib/api/types/dashboard";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiFetch<DashboardSummaryResponse>(
    "/admin/dashboard/summary",
    {
      cache: "no-store",
    },
  );
  return {
    ...response,
    filterSets: {
      "without-images": response.filterSets.withoutImages,
      "without-commercialization": response.filterSets.withoutCommercialization,
      "without-description": response.filterSets.withoutDescription,
      "without-features": response.filterSets.withoutFeatures,
      "pending-publication": response.filterSets.pendingPublication,
      "without-price": response.filterSets.withoutPrice,
      "recently-archived": response.filterSets.recentlyArchived,
    },
  };
}
