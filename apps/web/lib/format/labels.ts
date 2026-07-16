import type {
  Orientation,
  PropertyBrightness,
  PropertyCondition,
  PropertyFeatureCategory,
  PropertyLayout,
  PropertyListingType,
  PropertyType,
} from "@repo/shared-types";

const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  PH: "PH",
  OFFICE: "Oficina",
  COMMERCIAL: "Local",
  WAREHOUSE: "Galpón",
  INDUSTRIAL: "Industrial",
  LAND: "Terreno",
  FIELD: "Campo",
  GARAGE: "Cochera",
  COUNTRY_HOUSE: "Casa quinta",
  OTHER: "Otro",
};

const LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY_RENT: "Alquiler temporario",
};

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType];
}

export function getListingTypeLabel(listingType: PropertyListingType): string {
  return LISTING_TYPE_LABELS[listingType];
}

const FEATURE_CATEGORY_LABELS: Record<PropertyFeatureCategory, string> = {
  GENERAL: "Generales",
  SERVICE: "Servicios",
  ROOM: "Ambientes",
  AMENITY: "Amenities",
};

export function getFeatureCategoryLabel(
  category: PropertyFeatureCategory,
): string {
  return FEATURE_CATEGORY_LABELS[category];
}

export const FEATURE_CATEGORY_ORDER: PropertyFeatureCategory[] = [
  "GENERAL",
  "SERVICE",
  "ROOM",
  "AMENITY",
];

export const FILTER_PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyType | "";
  label: string;
}> = [
  { value: "", label: "Todos los tipos" },
  { value: "HOUSE", label: "Casa" },
  { value: "APARTMENT", label: "Departamento" },
  { value: "PH", label: "PH" },
  { value: "OFFICE", label: "Oficina" },
  { value: "COMMERCIAL", label: "Local comercial" },
  { value: "LAND", label: "Terreno / Lote" },
  { value: "GARAGE", label: "Cochera" },
  { value: "WAREHOUSE", label: "Depósito / Galpón" },
  { value: "FIELD", label: "Campo / Chacra" },
  { value: "COUNTRY_HOUSE", label: "Casa quinta" },
  { value: "INDUSTRIAL", label: "Industrial" },
  { value: "OTHER", label: "Otro" },
];

/** @deprecated Use FILTER_PROPERTY_TYPE_OPTIONS — kept as alias for shared order/labels. */
export const SEARCH_PROPERTY_TYPE_OPTIONS = FILTER_PROPERTY_TYPE_OPTIONS;

/** Ambientes filter options; values map to existing bedrooms query param. */
export const AMBIENTES_FILTER_OPTIONS = [
  { value: "1", label: "Monoambiente" },
  { value: "2", label: "2 ambientes" },
  { value: "3", label: "3 ambientes" },
  { value: "4", label: "4 ambientes" },
  { value: "5", label: "5 ambientes" },
  { value: "6", label: "Más de 5 ambientes" },
] as const;

/** Baños filter options; values map to existing bathrooms query param. */
export const BATHROOMS_FILTER_OPTIONS = [
  { value: "1", label: "1 baño" },
  { value: "2", label: "2 baños" },
  { value: "3", label: "3 baños" },
  { value: "4", label: "4 baños" },
  { value: "5", label: "5 baños" },
  { value: "6", label: "Más de 5 baños" },
] as const;

const PROPERTY_CONDITION_LABELS: Record<PropertyCondition, string> = {
  NEW: "A estrenar",
  EXCELLENT: "Excelente",
  VERY_GOOD: "Muy bueno",
  GOOD: "Bueno",
  REGULAR: "Regular",
  TO_RENOVATE: "A refaccionar",
  UNDER_CONSTRUCTION: "En construcción",
};

const ORIENTATION_LABELS: Record<Orientation, string> = {
  NORTH: "Norte",
  SOUTH: "Sur",
  EAST: "Este",
  WEST: "Oeste",
  NORTHEAST: "Noreste",
  NORTHWEST: "Noroeste",
  SOUTHEAST: "Sureste",
  SOUTHWEST: "Suroeste",
};

const PROPERTY_LAYOUT_LABELS: Record<PropertyLayout, string> = {
  FRONT: "Frente",
  BACK: "Contrafrente",
  SIDE: "Lateral",
  INTERNAL: "Interno",
  CORNER: "Esquina",
};

const PROPERTY_BRIGHTNESS_LABELS: Record<PropertyBrightness, string> = {
  LOW: "Baja",
  MEDIUM: "Media",
  HIGH: "Alta",
};

export function getPropertyConditionLabel(
  condition: PropertyCondition,
): string {
  return PROPERTY_CONDITION_LABELS[condition];
}

export function getOrientationLabel(orientation: Orientation): string {
  return ORIENTATION_LABELS[orientation];
}

export function getPropertyLayoutLabel(layout: PropertyLayout): string {
  return PROPERTY_LAYOUT_LABELS[layout];
}

export function getPropertyBrightnessLabel(
  brightness: PropertyBrightness,
): string {
  return PROPERTY_BRIGHTNESS_LABELS[brightness];
}
