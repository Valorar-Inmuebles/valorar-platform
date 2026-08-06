"use client";

import { GARAGE_TYPE_ATTRIBUTE } from "@repo/shared-types";
import {
  AMBIENTES_FILTER_OPTIONS,
  BATHROOMS_FILTER_OPTIONS,
  getListingTypeLabel,
  getPropertyTypeLabel,
} from "@/lib/format/labels";
import { formatMoney } from "@/lib/format/price";
import {
  hasActivePropertyListFilters,
  locationSelectionToListFilters,
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
      onRemove: () =>
        applyFilters({ propertyType: undefined, featureSlugs: undefined }),
    });
  }

  if (
    filters.propertyType === GARAGE_TYPE_ATTRIBUTE.propertyType &&
    filters.featureSlugs &&
    filters.featureSlugs.length > 0
  ) {
    for (const slug of filters.featureSlugs) {
      const option = GARAGE_TYPE_ATTRIBUTE.options.find((item) => item.slug === slug);

      chips.push({
        key: `featureSlugs:${slug}`,
        label: option?.label ?? slug,
        onRemove: () =>
          applyFilters({
            featureSlugs: filters.featureSlugs?.filter((item) => item !== slug),
          }),
      });
    }
  }

  if (filters.city) {
    chips.push({
      key: "locality",
      label: filters.city,
      onRemove: () => applyFilters(locationSelectionToListFilters(null)),
    });
  }

  if (filters.neighborhood) {
    chips.push({
      key: "neighborhood",
      label: filters.neighborhood,
      onRemove: () => applyFilters(locationSelectionToListFilters(null)),
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
    const currencyPrefix = filters.currency ? `${filters.currency} ` : "";
    chips.push({
      key: "priceMin",
      label: `Desde ${currencyPrefix}${formatMoney(filters.priceMin)}`,
      onRemove: () => applyFilters({ priceMin: undefined }),
    });
  }

  if (filters.priceMax != null) {
    const currencyPrefix = filters.currency ? `${filters.currency} ` : "";
    chips.push({
      key: "priceMax",
      label: `Hasta ${currencyPrefix}${formatMoney(filters.priceMax)}`,
      onRemove: () => applyFilters({ priceMax: undefined }),
    });
  }

  if (filters.bedrooms != null) {
    const ambientesLabel =
      AMBIENTES_FILTER_OPTIONS.find(
        (option) => option.value === String(filters.bedrooms),
      )?.label ?? `${filters.bedrooms}+ ambientes`;

    chips.push({
      key: "bedrooms",
      label: ambientesLabel,
      onRemove: () => applyFilters({ bedrooms: undefined }),
    });
  }

  if (filters.bathrooms != null) {
    const bathroomsLabel =
      BATHROOMS_FILTER_OPTIONS.find(
        (option) => option.value === String(filters.bathrooms),
      )?.label ?? `${filters.bathrooms}+ baños`;

    chips.push({
      key: "bathrooms",
      label: bathroomsLabel,
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
