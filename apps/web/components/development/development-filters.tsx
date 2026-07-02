"use client";

import { useEffect, useState } from "react";
import type { SelectedLocality } from "@/components/geo/geo-locality-search";
import {
  getInitialProvinceId,
  InventoryLocationFilters,
} from "@/components/search/inventory-location-filters";
import { useInventoryCoverage } from "@/components/search/inventory-coverage-context";
import { useDevelopmentFilters } from "@/hooks/use-list-filters";
import { hasActiveLocationFilters } from "@/lib/url/search-params";

const FILTER_INPUT =
  "h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-border-default/80 transition placeholder:text-muted focus:ring-brand-green/40";

type LocationFilterFormState = {
  provinceId: string;
  locality: SelectedLocality | null;
};

type DevelopmentFiltersProps = {
  onApplied?: () => void;
  className?: string;
};

function filtersToFormState(
  filters: ReturnType<typeof useDevelopmentFilters>["filters"],
  defaultProvinceId: string,
): LocationFilterFormState {
  const hasLocalityLabel = Boolean(filters.city);

  return {
    provinceId: filters.provinceId || defaultProvinceId,
    locality: hasLocalityLabel
      ? {
          provinceId: filters.provinceId ?? defaultProvinceId,
          provinceName: "",
          localityId: filters.localityId ?? undefined,
          localityName: filters.city ?? "",
        }
      : null,
  };
}

export function DevelopmentFilters({
  onApplied,
  className = "",
}: DevelopmentFiltersProps) {
  const coverage = useInventoryCoverage();
  const { filters, applyFilters, clearFilters } = useDevelopmentFilters();
  const [form, setForm] = useState<LocationFilterFormState>(() =>
    filtersToFormState(filters, getInitialProvinceId(coverage)),
  );

  useEffect(() => {
    setForm(filtersToFormState(filters, getInitialProvinceId(coverage)));
  }, [coverage, filters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({
      provinceId:
        form.provinceId ||
        form.locality?.provinceId ||
        coverage.defaultProvinceId ||
        undefined,
      localityId: form.locality?.localityId || undefined,
      city: form.locality?.localityName || undefined,
      neighborhood: undefined,
    });

    onApplied?.();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`space-y-6 rounded-2xl border border-border bg-white p-5 shadow-sm ${className}`}
    >
      <div>
        <h2 className="text-base font-semibold text-foreground">Filtros</h2>
        <p className="mt-1 text-sm text-muted">Refiná por ubicación.</p>
      </div>

      <InventoryLocationFilters
        coverage={coverage}
        provinceId={form.provinceId}
        onProvinceIdChange={(provinceId) =>
          setForm((current) => ({ ...current, provinceId, locality: null }))
        }
        locality={form.locality}
        onLocalityChange={(locality) =>
          setForm((current) => ({
            ...current,
            locality,
            provinceId: locality?.provinceId ?? current.provinceId,
          }))
        }
        inputClassName={FILTER_INPUT}
        provincePlaceholder="Todas las provincias"
      />

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-text-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Aplicar filtros
        </button>
        {hasActiveLocationFilters(filters) ? (
          <button
            type="button"
            onClick={() => {
              clearFilters();
              onApplied?.();
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>
    </form>
  );
}
