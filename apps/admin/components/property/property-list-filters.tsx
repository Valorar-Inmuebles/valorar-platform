"use client";

import { Input } from "@repo/ui/input";
import { cn } from "@/lib/cn";
import {
  PROPERTY_COMMERCIAL_FILTER_LABELS,
  type PropertyCommercialFilter,
} from "@/lib/property/property-list";

type PropertyListFiltersProps = {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  commercialFilter: PropertyCommercialFilter;
  onCommercialFilterChange: (value: PropertyCommercialFilter) => void;
  counts: Record<PropertyCommercialFilter, number>;
};

const FILTER_ORDER: PropertyCommercialFilter[] = [
  "all",
  "active",
  "published",
  "commercial-draft",
  "archived",
];

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="size-4"
      aria-hidden
    >
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 10l3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function PropertyListFilters({
  searchQuery,
  onSearchQueryChange,
  commercialFilter,
  onCommercialFilterChange,
  counts,
}: PropertyListFiltersProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="w-full sm:max-w-sm">
        <Input
          type="search"
          placeholder="Buscar por título, código, ciudad o barrio…"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          leftIcon={<SearchIcon />}
          aria-label="Buscar propiedades"
        />
      </div>

      <div
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-surface p-1"
        role="tablist"
        aria-label="Filtrar por estado comercial"
      >
        {FILTER_ORDER.map((filter) => {
          const isActive = commercialFilter === filter;
          const count = counts[filter];

          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onCommercialFilterChange(filter)}
              className={cn(
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted hover:bg-zinc-100 hover:text-foreground",
              )}
            >
              {PROPERTY_COMMERCIAL_FILTER_LABELS[filter]}
              <span className="ml-1.5 tabular-nums opacity-80">({count})</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
