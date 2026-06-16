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

export const SEARCH_PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyType | "";
  label: string;
}> = [
  { value: "", label: "Todos los tipos" },
  { value: "HOUSE", label: "Casa" },
  { value: "APARTMENT", label: "Departamento" },
  { value: "PH", label: "PH" },
  { value: "OFFICE", label: "Oficina" },
  { value: "COMMERCIAL", label: "Local" },
  { value: "LAND", label: "Terreno" },
  { value: "COUNTRY_HOUSE", label: "Casa quinta" },
];

export const FILTER_PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyType | "";
  label: string;
}> = [
  { value: "", label: "Todos los tipos" },
  ...Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
    value: value as PropertyType,
    label,
  })),
];

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
