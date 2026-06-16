import type {
  AdminPropertyImage,
  CreatePropertyImagePayload,
  PropertyImageFormValues,
  UpdatePropertyImagePayload,
} from "@/lib/api/types/property-image";

export function emptyImageFormValues(): PropertyImageFormValues {
  return {
    storageKey: "",
    url: "",
    altText: "",
    sortOrder: "0",
  };
}

export function imageToFormValues(
  image: AdminPropertyImage,
): PropertyImageFormValues {
  return {
    storageKey: image.storageKey,
    url: image.url ?? "",
    altText: image.altText ?? "",
    sortOrder: image.sortOrder.toString(),
  };
}

function parseSortOrder(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function validateImageCreateValues(
  values: PropertyImageFormValues,
): string | null {
  if (!values.storageKey.trim()) {
    return "Ingresá la clave de almacenamiento (storageKey).";
  }

  const sortOrder = parseSortOrder(values.sortOrder);
  if (sortOrder === undefined || sortOrder < 0) {
    return "El orden debe ser un número entero mayor o igual a 0.";
  }

  return null;
}

export function validateImageEditValues(
  values: PropertyImageFormValues,
): string | null {
  const sortOrder = parseSortOrder(values.sortOrder);
  if (sortOrder === undefined || sortOrder < 0) {
    return "El orden debe ser un número entero mayor o igual a 0.";
  }

  return null;
}

export function formValuesToCreatePayload(
  values: PropertyImageFormValues,
): CreatePropertyImagePayload {
  const payload: CreatePropertyImagePayload = {
    storageKey: values.storageKey.trim(),
    sortOrder: parseSortOrder(values.sortOrder) ?? 0,
  };

  const url = values.url.trim();
  if (url) payload.url = url;

  const altText = values.altText.trim();
  if (altText) payload.altText = altText;

  return payload;
}

export function formValuesToUpdatePayload(
  values: PropertyImageFormValues,
): UpdatePropertyImagePayload {
  return {
    url: values.url.trim() || undefined,
    altText: values.altText.trim() || undefined,
    sortOrder: parseSortOrder(values.sortOrder) ?? 0,
  };
}
