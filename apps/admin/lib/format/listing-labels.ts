import type { PropertyListingType } from "@repo/shared-types";
import type { PropertyListingStatus } from "@/lib/api/types/property-listing";

export const LISTING_TYPE_LABELS: Record<PropertyListingType, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY_RENT: "Alquiler temporario",
};

export const LISTING_STATUS_LABELS: Record<PropertyListingStatus, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  RESERVED: "Reservada",
  CLOSED: "Cerrada",
};

export const LISTING_TYPE_OPTIONS: Array<{
  value: PropertyListingType;
  label: string;
}> = Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => ({
  value: value as PropertyListingType,
  label,
}));

export const CURRENCY_OPTIONS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
] as const;

export function getListingTypeLabel(listingType: PropertyListingType): string {
  return LISTING_TYPE_LABELS[listingType];
}

export function getListingStatusLabel(status: PropertyListingStatus): string {
  return LISTING_STATUS_LABELS[status];
}

const STATUS_TRANSITIONS: Record<
  PropertyListingStatus,
  PropertyListingStatus[]
> = {
  DRAFT: ["DRAFT", "ACTIVE", "CLOSED"],
  ACTIVE: ["ACTIVE", "PAUSED", "RESERVED", "CLOSED"],
  PAUSED: ["PAUSED", "ACTIVE", "CLOSED"],
  RESERVED: ["RESERVED", "ACTIVE", "CLOSED"],
  CLOSED: ["CLOSED", "ACTIVE"],
};

export function getAllowedStatusTransitions(
  current: PropertyListingStatus,
): PropertyListingStatus[] {
  return STATUS_TRANSITIONS[current];
}

export function getListingStatusOptions(current: PropertyListingStatus) {
  return getAllowedStatusTransitions(current).map((status) => ({
    value: status,
    label: getListingStatusLabel(status),
  }));
}
