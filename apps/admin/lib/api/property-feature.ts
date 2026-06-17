import { apiFetch } from "@/lib/api/client";
import type { AdminPropertyFeature } from "@/lib/api/types/property-feature";
import type { PropertyFeatureCategory } from "@repo/shared-types";

type ListPropertyFeaturesOptions = {
  category?: PropertyFeatureCategory;
  isActive?: boolean;
};

function buildQuery(options: ListPropertyFeaturesOptions = {}) {
  const params = new URLSearchParams();

  if (options.category) {
    params.set("category", options.category);
  }

  if (options.isActive !== undefined) {
    params.set("isActive", String(options.isActive));
  }

  const query = params.toString();
  return query.length > 0 ? `?${query}` : "";
}

export async function listPropertyFeatures(
  options: ListPropertyFeaturesOptions = {},
): Promise<AdminPropertyFeature[]> {
  return apiFetch<AdminPropertyFeature[]>(
    `/property-features${buildQuery(options)}`,
    { cache: "no-store" },
  );
}
