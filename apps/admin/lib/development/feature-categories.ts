import type { PropertyFeatureCategory } from "@repo/shared-types";

/** Building-level categories for Development (excludes ROOM / Ambientes). */
export const DEVELOPMENT_FEATURE_CATEGORIES: PropertyFeatureCategory[] = [
  "GENERAL",
  "SERVICE",
  "AMENITY",
];

/** Unit-level categories for DevelopmentTypology. */
export const TYPOLOGY_FEATURE_CATEGORIES: PropertyFeatureCategory[] = ["ROOM"];

export function isDevelopmentFeatureCategory(
  category: PropertyFeatureCategory,
): boolean {
  return DEVELOPMENT_FEATURE_CATEGORIES.includes(category);
}

export function isTypologyFeatureCategory(
  category: PropertyFeatureCategory,
): boolean {
  return TYPOLOGY_FEATURE_CATEGORIES.includes(category);
}

export const TYPOLOGY_FEATURE_CATEGORY_ORDER: PropertyFeatureCategory[] = [
  "ROOM",
];
