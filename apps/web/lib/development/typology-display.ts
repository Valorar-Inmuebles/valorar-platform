import type { PublicDevelopmentTypology } from "@repo/shared-types";
import { formatArea } from "@/lib/format/area";
import { formatPrice } from "@/lib/format/price";

export type TypologyDisplayItem = {
  key: string;
  label: string;
  value: string;
};

export function formatTypologySurfaceRange(
  typology: Pick<PublicDevelopmentTypology, "surfaceFrom" | "surfaceTo">,
): string | null {
  const { surfaceFrom, surfaceTo } = typology;

  if (surfaceFrom != null && surfaceTo != null && surfaceTo !== surfaceFrom) {
    const from = formatArea(surfaceFrom);
    const to = formatArea(surfaceTo);
    if (from && to) return `${from} – ${to}`;
  }

  if (surfaceFrom != null) {
    return formatArea(surfaceFrom);
  }

  if (surfaceTo != null) {
    return formatArea(surfaceTo);
  }

  return null;
}

export function formatTypologyPriceFrom(
  typology: Pick<PublicDevelopmentTypology, "priceFrom" | "currency">,
): string | null {
  if (typology.priceFrom == null || !typology.currency) {
    return null;
  }

  const formatted = formatPrice(typology.priceFrom, typology.currency);
  return formatted ? `Desde ${formatted}` : null;
}

export function formatTypologyAvailableCount(
  typology: Pick<PublicDevelopmentTypology, "availableCount">,
): string | null {
  if (typology.availableCount == null) {
    return null;
  }

  return `${typology.availableCount} disponible${typology.availableCount === 1 ? "" : "s"}`;
}

export function buildTypologyFeatureItems(
  typology: PublicDevelopmentTypology,
): TypologyDisplayItem[] {
  return typology.features.map((feature) => ({
    key: feature.id,
    label: feature.name,
    value: feature.value?.trim() || "Sí",
  }));
}

export function buildTypologyDisplayItems(
  typology: PublicDevelopmentTypology,
): TypologyDisplayItem[] {
  const items: TypologyDisplayItem[] = [];

  const price = formatTypologyPriceFrom(typology);
  if (price) {
    items.push({ key: "price", label: "Precio", value: price });
  }

  const surface = formatTypologySurfaceRange(typology);
  if (surface) {
    items.push({ key: "surface", label: "Superficie", value: surface });
  }

  const available = formatTypologyAvailableCount(typology);
  if (available) {
    items.push({ key: "available", label: "Disponibles", value: available });
  }

  items.push(...buildTypologyFeatureItems(typology));

  return items;
}
