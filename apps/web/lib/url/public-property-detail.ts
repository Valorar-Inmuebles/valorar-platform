import type { PropertyListingType } from "@repo/shared-types";

export function buildPublicPropertyDetailHref(
  slug: string,
  listingType: PropertyListingType,
): string {
  const params = new URLSearchParams({ listingType });
  return `/propiedades/${encodeURIComponent(slug)}?${params.toString()}`;
}
