import { apiFetch } from "@/lib/api/client";
import type { DashboardSummary } from "@/lib/api/types/dashboard";

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/admin/dashboard/summary", {
    cache: "no-store",
  });
}
