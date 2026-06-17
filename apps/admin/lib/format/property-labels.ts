import type {
  Orientation,
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
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

export const PROPERTY_TYPE_OPTIONS: Array<{
  value: PropertyType;
  label: string;
}> = Object.entries(PROPERTY_TYPE_LABELS).map(([value, label]) => ({
  value: value as PropertyType,
  label,
}));

export const PROPERTY_CONDITION_OPTIONS: Array<{
  value: PropertyCondition;
  label: string;
}> = Object.entries(PROPERTY_CONDITION_LABELS).map(([value, label]) => ({
  value: value as PropertyCondition,
  label,
}));

export const ORIENTATION_OPTIONS: Array<{
  value: Orientation;
  label: string;
}> = Object.entries(ORIENTATION_LABELS).map(([value, label]) => ({
  value: value as Orientation,
  label,
}));

export const PROPERTY_LAYOUT_OPTIONS: Array<{
  value: PropertyLayout;
  label: string;
}> = Object.entries(PROPERTY_LAYOUT_LABELS).map(([value, label]) => ({
  value: value as PropertyLayout,
  label,
}));

export const PROPERTY_BRIGHTNESS_OPTIONS: Array<{
  value: PropertyBrightness;
  label: string;
}> = Object.entries(PROPERTY_BRIGHTNESS_LABELS).map(([value, label]) => ({
  value: value as PropertyBrightness,
  label,
}));

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType];
}

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
