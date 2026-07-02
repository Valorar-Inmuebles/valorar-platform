"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Currency, PropertyListingType, PropertyType } from "@repo/shared-types";
import { moneyToInputValue, parseMoneyInput } from "@repo/shared-types/format-money";
import { CurrencyInput } from "@repo/ui/currency-input";
import {
  getInitialProvinceId,
  InventoryLocationFilters,
} from "@/components/search/inventory-location-filters";
import { useInventoryCoverage } from "@/components/search/inventory-coverage-context";
import { FILTER_PROPERTY_TYPE_OPTIONS } from "@/lib/format/labels";
import { usePropertyFilters } from "@/hooks/use-property-filters";
import type { SelectedLocality } from "@/components/geo/geo-locality-search";

const LISTING_TYPE_OPTIONS: Array<{
  value: PropertyListingType | "";
  label: string;
}> = [
  { value: "", label: "Todas" },
  { value: "SALE", label: "Venta" },
  { value: "RENT", label: "Alquiler" },
];

const ROOM_COUNT_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

const FILTER_INPUT =
  "h-11 w-full rounded-xl bg-white px-3 text-sm outline-none ring-1 ring-border-default/80 transition placeholder:text-muted focus:ring-brand-green/40";

type FilterFormState = {
  listingType: PropertyListingType | "";
  propertyType: PropertyType | "";
  provinceId: string;
  locality: SelectedLocality | null;
  priceMin: string;
  priceMax: string;
  currency: Currency | "";
  bedrooms: string;
  bathrooms: string;
};

type PropertyFiltersProps = {
  onApplied?: () => void;
  className?: string;
};

function filtersToFormState(
  filters: ReturnType<typeof usePropertyFilters>["filters"],
): FilterFormState {
  const hasLocalityLabel = Boolean(filters.city);

  return {
    listingType: filters.listingType ?? "",
    propertyType: filters.propertyType ?? "",
    provinceId: filters.provinceId ?? "",
    locality: hasLocalityLabel
      ? {
          provinceId: filters.provinceId ?? "",
          provinceName: "",
          localityId: filters.localityId ?? "",
          localityName: filters.city ?? "",
        }
      : null,
    priceMin: filters.priceMin != null ? moneyToInputValue(filters.priceMin) : "",
    priceMax: filters.priceMax != null ? moneyToInputValue(filters.priceMax) : "",
    currency: filters.currency ?? "",
    bedrooms: filters.bedrooms != null ? String(filters.bedrooms) : "",
    bathrooms: filters.bathrooms != null ? String(filters.bathrooms) : "",
  };
}

function parseOptionalNumber(value: string): number | undefined {
  return parseMoneyInput(value);
}

function parseOptionalIntField(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function isSameFormState(a: FilterFormState, b: FilterFormState): boolean {
  return (
    a.listingType === b.listingType &&
    a.propertyType === b.propertyType &&
    a.provinceId === b.provinceId &&
    a.locality?.localityId === b.locality?.localityId &&
    a.locality?.localityName === b.locality?.localityName &&
    a.priceMin === b.priceMin &&
    a.priceMax === b.priceMax &&
    a.currency === b.currency &&
    a.bedrooms === b.bedrooms &&
    a.bathrooms === b.bathrooms
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-xs font-medium uppercase tracking-wide text-text-secondary">
        {title}
      </p>
      {children}
    </div>
  );
}

export function PropertyFilters({ onApplied, className = "" }: PropertyFiltersProps) {
  const coverage = useInventoryCoverage();
  const { filters, applyFilters, clearFilters } = usePropertyFilters();
  const [form, setForm] = useState<FilterFormState>(() => ({
    ...filtersToFormState(filters),
    provinceId: filters.provinceId || getInitialProvinceId(coverage),
  }));

  useEffect(() => {
    const nextForm = {
      ...filtersToFormState(filters),
      provinceId: filters.provinceId || getInitialProvinceId(coverage),
    };
    setForm((current) =>
      isSameFormState(current, nextForm) ? current : nextForm,
    );
  }, [coverage, filters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({
      listingType: form.listingType || undefined,
      propertyType: form.propertyType || undefined,
      provinceId:
        form.provinceId ||
        form.locality?.provinceId ||
        coverage.defaultProvinceId ||
        undefined,
      localityId: form.locality?.localityId || undefined,
      city: form.locality?.localityName || undefined,
      neighborhood: undefined,
      priceMin: parseOptionalNumber(form.priceMin),
      priceMax: parseOptionalNumber(form.priceMax),
      currency: form.currency || undefined,
      bedrooms: parseOptionalIntField(form.bedrooms),
      bathrooms: parseOptionalIntField(form.bathrooms),
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
        <p className="mt-1 text-sm text-muted">Refiná por ubicación, operación y precio.</p>
      </div>

      <FilterSection title="Operación">
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPE_OPTIONS.map((option) => {
            const isActive = form.listingType === option.value;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() =>
                  setForm((current) => ({ ...current, listingType: option.value }))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
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
      </FilterSection>

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

      <FilterSection title="Tipo">
        <select
          value={form.propertyType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              propertyType: event.target.value as PropertyType | "",
            }))
          }
          className={FILTER_INPUT}
        >
          {FILTER_PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </FilterSection>

      <FilterSection title="Precio">
        <div className="flex flex-wrap gap-2">
          {[
            { value: "", label: "Todas" },
            { value: "ARS", label: "ARS" },
            { value: "USD", label: "USD" },
          ].map((option) => {
            const isActive = form.currency === option.value;
            return (
              <button
                key={option.label}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    currency: option.value as Currency | "",
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
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
        <div className="mt-2 grid grid-cols-2 gap-2">
          <CurrencyInput
            unstyled
            value={form.priceMin}
            onChange={(value) =>
              setForm((current) => ({ ...current, priceMin: value }))
            }
            placeholder="Mín."
            className={FILTER_INPUT}
          />
          <CurrencyInput
            unstyled
            value={form.priceMax}
            onChange={(value) =>
              setForm((current) => ({ ...current, priceMax: value }))
            }
            placeholder="Máx."
            className={FILTER_INPUT}
          />
        </div>
      </FilterSection>

      <FilterSection title="Ambientes">
        <div className="grid grid-cols-2 gap-2">
          <select
            value={form.bedrooms}
            onChange={(event) =>
              setForm((current) => ({ ...current, bedrooms: event.target.value }))
            }
            className={FILTER_INPUT}
            aria-label="Dormitorios"
          >
            <option value="">Dorm. cualquiera</option>
            {ROOM_COUNT_OPTIONS.filter((o) => o.value).map((option) => (
              <option key={option.label} value={option.value}>
                {option.label.replace("+", "+ dorm.")}
              </option>
            ))}
          </select>
          <select
            value={form.bathrooms}
            onChange={(event) =>
              setForm((current) => ({ ...current, bathrooms: event.target.value }))
            }
            className={FILTER_INPUT}
            aria-label="Baños"
          >
            <option value="">Baños cualquiera</option>
            {ROOM_COUNT_OPTIONS.filter((o) => o.value).map((option) => (
              <option key={`bath-${option.label}`} value={option.value}>
                {option.label.replace("+", "+ baños")}
              </option>
            ))}
          </select>
        </div>
      </FilterSection>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-text-primary px-4 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Aplicar filtros
        </button>
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
      </div>
    </form>
  );
}
