import type { PropertyType } from "@repo/shared-types";
import type { PropertyCondition } from "@/lib/api/types/property";

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

export function getPropertyTypeLabel(propertyType: PropertyType): string {
  return PROPERTY_TYPE_LABELS[propertyType];
}

export function getPropertyConditionLabel(
  condition: PropertyCondition,
): string {
  return PROPERTY_CONDITION_LABELS[condition];
}
