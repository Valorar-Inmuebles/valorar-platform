import type { AdminProperty } from "@/lib/api/types/property";
import type { PropertyPublishabilitySummaryItem } from "@/lib/api/types/property-publishability-summary";
import type { DashboardAttentionFilter, DashboardFilterSets } from "@/lib/api/types/dashboard";
import {
  buildPublicPropertyUrl,
  resolvePropertyStatusVariant,
} from "@/lib/property/publishability";
import type { PropertyStatusVariant } from "@/lib/property/navigation";

export type PropertyCommercialFilter =
  | "all"
  | "active"
  | "published"
  | "commercial-draft"
  | "archived";

export const PROPERTY_COMMERCIAL_FILTER_LABELS: Record<
  PropertyCommercialFilter,
  string
> = {
  all: "Todas",
  active: "Activas",
  published: "Publicadas",
  "commercial-draft": "Borradores",
  archived: "Archivadas",
};

export function resolveRowStatusVariant(
  property: AdminProperty,
  summary: PropertyPublishabilitySummaryItem | undefined,
): PropertyStatusVariant {
  if (summary) {
    return summary.statusVariant;
  }

  return resolvePropertyStatusVariant(property, false);
}

export function resolveRowPublicUrl(
  property: AdminProperty,
  summary: PropertyPublishabilitySummaryItem | undefined,
): string | null {
  if (summary?.publicUrl) {
    return summary.publicUrl;
  }

  if (summary?.isAnyPublishable) {
    return buildPublicPropertyUrl(property.slug);
  }

  return null;
}

export function matchesPropertySearch(
  property: AdminProperty,
  query: string,
): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  const haystack = [
    property.title,
    property.internalCode,
    property.city,
    property.neighborhood,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalized);
}

export const PROPERTY_ATTENTION_FILTER_LABELS: Record<
  DashboardAttentionFilter,
  string
> = {
  "without-images": "Sin imágenes",
  "without-commercialization": "Sin comercialización",
  "without-description": "Sin descripción",
  "without-features": "Sin características",
  "pending-publication": "Pendientes de publicación",
  "without-price": "Sin precio",
  "recently-archived": "Archivadas recientemente",
};

export function matchesAttentionFilter(
  propertyId: string,
  attentionFilter: DashboardAttentionFilter,
  filterSets: DashboardFilterSets,
): boolean {
  return filterSets[attentionFilter].includes(propertyId);
}

export function matchesCommercialFilter(
  property: AdminProperty,
  summary: PropertyPublishabilitySummaryItem | undefined,
  filter: PropertyCommercialFilter,
): boolean {
  if (filter === "all") {
    return true;
  }

  const variant = resolveRowStatusVariant(property, summary);

  if (filter === "active") {
    return variant !== "archived";
  }

  return variant === filter;
}

export function filterPropertiesForList(
  properties: AdminProperty[],
  summaryByPropertyId: Record<string, PropertyPublishabilitySummaryItem>,
  options: {
    searchQuery: string;
    commercialFilter: PropertyCommercialFilter;
    attentionFilter?: DashboardAttentionFilter | null;
    attentionFilterSets?: DashboardFilterSets | null;
  },
): AdminProperty[] {
  return properties.filter((property) => {
    const summary = summaryByPropertyId[property.id];

    const matchesAttention =
      !options.attentionFilter ||
      !options.attentionFilterSets ||
      matchesAttentionFilter(
        property.id,
        options.attentionFilter,
        options.attentionFilterSets,
      );

    return (
      matchesPropertySearch(property, options.searchQuery) &&
      matchesCommercialFilter(property, summary, options.commercialFilter) &&
      matchesAttention
    );
  });
}

export function countByCommercialStatus(
  properties: AdminProperty[],
  summaryByPropertyId: Record<string, PropertyPublishabilitySummaryItem>,
): Record<PropertyCommercialFilter, number> {
  const counts: Record<PropertyCommercialFilter, number> = {
    all: properties.length,
    active: 0,
    published: 0,
    "commercial-draft": 0,
    archived: 0,
  };

  for (const property of properties) {
    const variant = resolveRowStatusVariant(
      property,
      summaryByPropertyId[property.id],
    );

    if (variant === "published") {
      counts.published += 1;
      counts.active += 1;
    } else if (variant === "commercial-draft") {
      counts["commercial-draft"] += 1;
      counts.active += 1;
    } else if (variant === "archived") {
      counts.archived += 1;
    }
  }

  return counts;
}
