"use client";

import { useEffect, useState } from "react";
import {
  DEVELOPMENT_STATUS_OPTIONS,
  type DevelopmentStatus,
  type PublicDevelopmentCard,
} from "@repo/shared-types";
import type { SelectedLocality } from "@/components/geo/geo-locality-search";
import { DevelopmentRecentLinks } from "@/components/development/development-recent-links";
import {
  getInitialProvinceId,
  InventoryLocationFilters,
} from "@/components/search/inventory-location-filters";
import { useInventoryCoverage } from "@/components/search/inventory-coverage-context";
import { useDevelopmentFilters } from "@/hooks/use-list-filters";
import {
  hasActiveDevelopmentListFilters,
  listFiltersToLocationSelection,
  locationSelectionToListFilters,
} from "@/lib/url/search-params";

const FILTER_INPUT =
  "h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-border-default/80 transition placeholder:text-muted focus:ring-brand-green/40";

type LocationFilterFormState = {
  provinceId: string;
  locality: SelectedLocality | null;
  developmentStatus: DevelopmentStatus | "";
};

type DevelopmentFiltersProps = {
  onApplied?: () => void;
  className?: string;
  recentDevelopments?: PublicDevelopmentCard[];
};

function filtersToFormState(
  filters: ReturnType<typeof useDevelopmentFilters>["filters"],
  defaultProvinceId: string,
): LocationFilterFormState {
  const locationSelection = listFiltersToLocationSelection(filters);

  return {
    provinceId: filters.provinceId || defaultProvinceId,
    developmentStatus: filters.developmentStatus ?? "",
    locality: locationSelection
      ? {
          provinceId: locationSelection.provinceId || defaultProvinceId,
          provinceName: "",
          localityId: locationSelection.localityId,
          localityName: locationSelection.localityName,
          neighborhoodId: locationSelection.neighborhoodId,
          kind: locationSelection.kind,
        }
      : null,
  };
}

export function DevelopmentFilters({
  onApplied,
  className = "",
  recentDevelopments = [],
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

    applyFilters(
      {
        ...locationSelectionToListFilters(
          form.locality
            ? {
                ...form.locality,
                provinceId:
                  form.provinceId ||
                  form.locality.provinceId ||
                  coverage.defaultProvinceId ||
                  "",
              }
            : form.provinceId || coverage.defaultProvinceId
              ? {
                  provinceId: form.provinceId || coverage.defaultProvinceId || "",
                  localityName: "",
                  kind: "province" as const,
                }
              : null,
        ),
        developmentStatus: form.developmentStatus || undefined,
      },
    );

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

      <div className="space-y-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
          Estado de la obra
        </p>
        <div className="flex flex-wrap gap-2">
          {DEVELOPMENT_STATUS_OPTIONS.map((option) => {
            const isActive = form.developmentStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    developmentStatus:
                      current.developmentStatus === option.value
                        ? ""
                        : option.value,
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
                  isActive
                    ? "bg-text-primary text-white"
                    : "bg-surface-alt text-text-primary hover:bg-surface-base"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-text-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Aplicar filtros
        </button>
        {hasActiveDevelopmentListFilters(filters) ? (
          <button
            type="button"
            onClick={() => {
              clearFilters();
              setForm((current) => ({ ...current, developmentStatus: "" }));
              onApplied?.();
            }}
            className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium text-text-secondary transition hover:text-text-primary"
          >
            Limpiar filtros
          </button>
        ) : null}
      </div>

      <DevelopmentRecentLinks developments={recentDevelopments} />
    </form>
  );
}
