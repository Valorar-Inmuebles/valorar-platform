"use client";

import {
  getListingTypeLabel,
  getPropertyTypeLabel,
} from "@/lib/format/labels";
import {
  hasActivePropertyListFilters,
  type PropertyListFilters,
} from "@/lib/url/search-params";
import { usePropertyFilters } from "@/hooks/use-property-filters";

type ActiveFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

function buildActiveFilterChips(
  filters: PropertyListFilters,
  applyFilters: (next: Partial<PropertyListFilters>) => void,
): ActiveFilterChip[] {
  const chips: ActiveFilterChip[] = [];

  if (filters.listingType) {
    chips.push({
      key: "listingType",
      label: getListingTypeLabel(filters.listingType),
      onRemove: () => applyFilters({ listingType: undefined }),
    });
  }

  if (filters.propertyType) {
    chips.push({
      key: "propertyType",
      label: getPropertyTypeLabel(filters.propertyType),
      onRemove: () => applyFilters({ propertyType: undefined }),
    });
  }

  if (filters.city) {
    chips.push({
      key: "city",
      label: filters.city,
      onRemove: () => applyFilters({ city: undefined }),
    });
  }

  if (filters.neighborhood) {
    chips.push({
      key: "neighborhood",
      label: filters.neighborhood,
      onRemove: () => applyFilters({ neighborhood: undefined }),
    });
  }

  if (filters.currency) {
    chips.push({
      key: "currency",
      label: filters.currency,
      onRemove: () => applyFilters({ currency: undefined }),
    });
  }

  if (filters.priceMin != null) {
    chips.push({
      key: "priceMin",
      label: `Desde ${filters.priceMin.toLocaleString("es-AR")}`,
      onRemove: () => applyFilters({ priceMin: undefined }),
    });
  }

  if (filters.priceMax != null) {
    chips.push({
      key: "priceMax",
      label: `Hasta ${filters.priceMax.toLocaleString("es-AR")}`,
      onRemove: () => applyFilters({ priceMax: undefined }),
    });
  }

  if (filters.bedrooms != null) {
    chips.push({
      key: "bedrooms",
      label: `${filters.bedrooms}+ dorm.`,
      onRemove: () => applyFilters({ bedrooms: undefined }),
    });
  }

  if (filters.bathrooms != null) {
    chips.push({
      key: "bathrooms",
      label: `${filters.bathrooms}+ baños`,
      onRemove: () => applyFilters({ bathrooms: undefined }),
    });
  }

  return chips;
}

export function ActiveFiltersBar() {
  const { filters, applyFilters, clearFilters } = usePropertyFilters();

  if (!hasActivePropertyListFilters(filters)) {
    return null;
  }

  const chips = buildActiveFilterChips(filters, applyFilters);

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          onClick={chip.onRemove}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-slate-50 px-3 py-1.5 text-sm text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {chip.label}
          <span aria-hidden>×</span>
        </button>
      ))}
      <button
        type="button"
        onClick={clearFilters}
        className="text-sm font-medium text-primary transition hover:text-primary/80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
