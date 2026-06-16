import type { PropertyListingStatus } from "@/lib/api/types/property-listing";
import type {
  AdminPropertyPrice,
  CreatePropertyPricePayload,
  PropertyPriceFormValues,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";

const PUBLISHABLE_LISTING_STATUSES: PropertyListingStatus[] = [
  "ACTIVE",
  "PAUSED",
  "RESERVED",
];

export function emptyPriceFormValues(): PropertyPriceFormValues {
  return {
    amount: "",
    currency: "",
    label: "",
  };
}

export function priceToFormValues(
  price: AdminPropertyPrice,
): PropertyPriceFormValues {
  return {
    amount: price.amount.toString(),
    currency: price.currency,
    label: price.label ?? "",
  };
}

function parseAmount(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseFloat(trimmed);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function validatePriceFormValues(
  values: PropertyPriceFormValues,
): string | null {
  if (!values.currency) return "Seleccioná una moneda.";

  const amount = parseAmount(values.amount);
  if (amount === undefined) return "Ingresá un monto válido.";
  if (amount <= 0) return "El monto debe ser mayor a 0.";

  return null;
}

export function formValuesToCreatePayload(
  values: PropertyPriceFormValues,
): CreatePropertyPricePayload {
  const payload: CreatePropertyPricePayload = {
    amount: parseAmount(values.amount)!,
    currency: values.currency as CreatePropertyPricePayload["currency"],
  };

  const label = values.label.trim();
  if (label) payload.label = label;

  return payload;
}

export function formValuesToUpdatePayload(
  values: PropertyPriceFormValues,
): UpdatePropertyPricePayload {
  const payload: UpdatePropertyPricePayload = {
    amount: parseAmount(values.amount),
    currency: values.currency as UpdatePropertyPricePayload["currency"],
    label: values.label.trim() || undefined,
  };

  return payload;
}

export function canDeletePrice(
  priceCount: number,
  listingStatus: PropertyListingStatus,
): boolean {
  if (priceCount > 1) return true;
  return !PUBLISHABLE_LISTING_STATUSES.includes(listingStatus);
}

export function getDeleteBlockedReason(
  priceCount: number,
  listingStatus: PropertyListingStatus,
): string | null {
  if (canDeletePrice(priceCount, listingStatus)) return null;
  return "No podés eliminar el único precio de una publicación activa, pausada o reservada.";
}
