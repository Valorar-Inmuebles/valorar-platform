import type { PropertyListingType, PropertyType } from "@repo/shared-types";

/** SEO landing URL segments — future pages under `/explorar/`. */
export const LISTING_TYPE_LANDING_SLUGS: Record<string, PropertyListingType> = {
  venta: "SALE",
  alquiler: "RENT",
  temporario: "TEMPORARY_RENT",
};

export const PROPERTY_TYPE_LANDING_SLUGS: Record<string, PropertyType> = {
  casas: "HOUSE",
  departamentos: "APARTMENT",
  ph: "PH",
  oficinas: "OFFICE",
  locales: "COMMERCIAL",
  terrenos: "LAND",
  cocheras: "GARAGE",
  "casas-quinta": "COUNTRY_HOUSE",
};

export type LandingPathSegments = {
  provinceSlug?: string;
  localitySlug?: string;
  propertyTypeSlug?: string;
  listingTypeSlug?: string;
};

export function parseLandingSegments(segments: string[]): LandingPathSegments | null {
  const cleaned = segments.map((segment) => segment.trim().toLowerCase()).filter(Boolean);

  if (cleaned.length === 0 || cleaned.length > 4) {
    return null;
  }

  const [provinceSlug, localitySlug, propertyTypeSlug, listingTypeSlug] = cleaned;

  if (propertyTypeSlug && !PROPERTY_TYPE_LANDING_SLUGS[propertyTypeSlug]) {
    return null;
  }

  if (listingTypeSlug && !LISTING_TYPE_LANDING_SLUGS[listingTypeSlug]) {
    return null;
  }

  return {
    provinceSlug,
    localitySlug,
    propertyTypeSlug,
    listingTypeSlug,
  };
}

export function buildLandingPath(parts: LandingPathSegments): string {
  const segments = [
    parts.provinceSlug,
    parts.localitySlug,
    parts.propertyTypeSlug,
    parts.listingTypeSlug,
  ].filter(Boolean);

  return segments.length > 0 ? `/explorar/${segments.join("/")}` : "/explorar";
}
