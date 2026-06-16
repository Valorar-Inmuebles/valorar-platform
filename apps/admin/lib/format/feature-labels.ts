import type { PropertyFeatureCategory } from "@repo/shared-types";

const FEATURE_CATEGORY_LABELS: Record<PropertyFeatureCategory, string> = {
  GENERAL: "Generales",
  SERVICE: "Servicios",
  ROOM: "Ambientes",
  AMENITY: "Amenities",
};

export const FEATURE_CATEGORY_ORDER: PropertyFeatureCategory[] = [
  "GENERAL",
  "SERVICE",
  "ROOM",
  "AMENITY",
];

export function getFeatureCategoryLabel(
  category: PropertyFeatureCategory,
): string {
  return FEATURE_CATEGORY_LABELS[category];
}
