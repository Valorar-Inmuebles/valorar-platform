import type { PropertyListingType, PropertyType } from "@repo/shared-types";

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
