import type { PropertyCommercialFilter } from "@/lib/property/property-list";

const VALID_FILTERS: PropertyCommercialFilter[] = [
  "all",
  "active",
  "published",
  "commercial-draft",
  "archived",
];

export function parsePropertyListHref(
  estado: string | null | undefined,
): PropertyCommercialFilter {
  if (!estado) {
    return "all";
  }

  if (VALID_FILTERS.includes(estado as PropertyCommercialFilter)) {
    return estado as PropertyCommercialFilter;
  }

  return "all";
}

export function buildPropertyListHref(
  filter: PropertyCommercialFilter,
): string {
  if (filter === "all") {
    return "/propiedades";
  }

  return `/propiedades?estado=${encodeURIComponent(filter)}`;
}
