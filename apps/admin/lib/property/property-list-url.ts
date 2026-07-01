import type { PropertyCommercialFilter } from "@/lib/property/property-list";
import type { DashboardAttentionFilter } from "@/lib/api/types/dashboard";

const VALID_COMMERCIAL_FILTERS: PropertyCommercialFilter[] = [
  "all",
  "active",
  "published",
  "commercial-draft",
  "archived",
];

const VALID_ATTENTION_FILTERS: DashboardAttentionFilter[] = [
  "without-images",
  "without-commercialization",
  "without-description",
  "without-features",
  "pending-publication",
  "without-price",
  "recently-archived",
];

export function parsePropertyListHref(
  estado: string | null | undefined,
): PropertyCommercialFilter {
  if (!estado) {
    return "all";
  }

  if (VALID_COMMERCIAL_FILTERS.includes(estado as PropertyCommercialFilter)) {
    return estado as PropertyCommercialFilter;
  }

  return "all";
}

export function parseAttentionFilter(
  atencion: string | null | undefined,
): DashboardAttentionFilter | null {
  if (!atencion) {
    return null;
  }

  if (VALID_ATTENTION_FILTERS.includes(atencion as DashboardAttentionFilter)) {
    return atencion as DashboardAttentionFilter;
  }

  return null;
}

export function buildPropertyListHref(
  filter: PropertyCommercialFilter,
): string {
  if (filter === "all") {
    return "/propiedades";
  }

  return `/propiedades?estado=${encodeURIComponent(filter)}`;
}

export function buildAttentionListHref(
  filter: DashboardAttentionFilter,
): string {
  return `/propiedades?atencion=${encodeURIComponent(filter)}`;
}

export function buildDashboardPropertyHref(
  commercialFilter?: PropertyCommercialFilter,
  attentionFilter?: DashboardAttentionFilter | null,
): string {
  if (attentionFilter) {
    return buildAttentionListHref(attentionFilter);
  }

  if (commercialFilter) {
    return buildPropertyListHref(commercialFilter);
  }

  return "/propiedades";
}
