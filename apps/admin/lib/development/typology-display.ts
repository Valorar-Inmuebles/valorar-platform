import type { AdminDevelopmentTypology } from "@/lib/api/types/development-typology";
import { formatPrice } from "@/lib/format/price";
import type { PriceCurrency } from "@/lib/api/types/development";

export function formatTypologyUnits(typology: AdminDevelopmentTypology): string | null {
  const { availableCount, totalCount } = typology;

  if (availableCount != null && totalCount != null) {
    return `${availableCount} / ${totalCount}`;
  }

  if (availableCount != null) {
    return `${availableCount} disponibles`;
  }

  if (totalCount != null) {
    return `${totalCount} total`;
  }

  return null;
}

export function formatTypologySurface(typology: AdminDevelopmentTypology): string | null {
  const { surfaceFrom, surfaceTo } = typology;

  if (surfaceFrom != null && surfaceTo != null && surfaceTo !== surfaceFrom) {
    return `${surfaceFrom}–${surfaceTo} m²`;
  }

  if (surfaceFrom != null) {
    return `${surfaceFrom} m²`;
  }

  if (surfaceTo != null) {
    return `${surfaceTo} m²`;
  }

  return null;
}

export function formatTypologyPrice(typology: AdminDevelopmentTypology): string | null {
  if (typology.priceFrom == null || !typology.currency) {
    return null;
  }

  return formatPrice(typology.priceFrom, typology.currency as PriceCurrency);
}
