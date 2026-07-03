import { PropertyFeatureCategory } from '../../../../generated/prisma/client';

/** Building-level features allowed on Development. */
export const DEVELOPMENT_FEATURE_CATEGORIES: PropertyFeatureCategory[] = [
  PropertyFeatureCategory.GENERAL,
  PropertyFeatureCategory.SERVICE,
  PropertyFeatureCategory.AMENITY,
];

/** Unit-level features allowed on DevelopmentTypology. */
export const TYPOLOGY_FEATURE_CATEGORIES: PropertyFeatureCategory[] = [
  PropertyFeatureCategory.ROOM,
];

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
