"use client";

import { useDevelopmentFilters } from "@/hooks/use-list-filters";
import { hasActiveLocationFilters } from "@/lib/url/search-params";

type ActiveLocationFilterChip = {
  key: string;
  label: string;
  onRemove: () => void;
};

function buildLocationFilterChips(
  filters: ReturnType<typeof useDevelopmentFilters>["filters"],
  applyFilters: ReturnType<typeof useDevelopmentFilters>["applyFilters"],
): ActiveLocationFilterChip[] {
  const chips: ActiveLocationFilterChip[] = [];

  if (filters.city) {
    chips.push({
      key: "locality",
      label: filters.city,
      onRemove: () =>
        applyFilters({
          localityId: undefined,
          city: undefined,
          provinceId: undefined,
        }),
    });
  }

  return chips;
}

export function DevelopmentActiveFiltersBar() {
  const { filters, applyFilters, clearFilters } = useDevelopmentFilters();

  if (!hasActiveLocationFilters(filters)) {
    return null;
  }

  const chips = buildLocationFilterChips(filters, applyFilters);

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
