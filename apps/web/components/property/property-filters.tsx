"use client";

import { useEffect, useState } from "react";
import type { Currency, PropertyListingType, PropertyType } from "@repo/shared-types";
import { FILTER_PROPERTY_TYPE_OPTIONS } from "@/lib/format/labels";
import { usePropertyFilters } from "@/hooks/use-property-filters";

const LISTING_TYPE_OPTIONS: Array<{
  value: PropertyListingType | "";
  label: string;
}> = [
  { value: "", label: "Todas" },
  { value: "SALE", label: "Venta" },
  { value: "RENT", label: "Alquiler" },
  { value: "TEMPORARY_RENT", label: "Temporario" },
];

const ROOM_COUNT_OPTIONS = [
  { value: "", label: "Cualquiera" },
  { value: "1", label: "1+" },
  { value: "2", label: "2+" },
  { value: "3", label: "3+" },
  { value: "4", label: "4+" },
  { value: "5", label: "5+" },
];

type FilterFormState = {
  listingType: PropertyListingType | "";
  propertyType: PropertyType | "";
  city: string;
  neighborhood: string;
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
  return {
    listingType: filters.listingType ?? "",
    propertyType: filters.propertyType ?? "",
    city: filters.city ?? "",
    neighborhood: filters.neighborhood ?? "",
    priceMin: filters.priceMin != null ? String(filters.priceMin) : "",
    priceMax: filters.priceMax != null ? String(filters.priceMax) : "",
    currency: filters.currency ?? "",
    bedrooms: filters.bedrooms != null ? String(filters.bedrooms) : "",
    bathrooms: filters.bathrooms != null ? String(filters.bathrooms) : "",
  };
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function isSameFormState(a: FilterFormState, b: FilterFormState): boolean {
  return (
    a.listingType === b.listingType &&
    a.propertyType === b.propertyType &&
    a.city === b.city &&
    a.neighborhood === b.neighborhood &&
    a.priceMin === b.priceMin &&
    a.priceMax === b.priceMax &&
    a.currency === b.currency &&
    a.bedrooms === b.bedrooms &&
    a.bathrooms === b.bathrooms
  );
}

function parseOptionalIntField(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? undefined : parsed;
}

export function PropertyFilters({ onApplied, className = "" }: PropertyFiltersProps) {
  const { filters, applyFilters, clearFilters } = usePropertyFilters();
  const [form, setForm] = useState<FilterFormState>(() => filtersToFormState(filters));

  useEffect(() => {
    const nextForm = filtersToFormState(filters);

    setForm((current) =>
      isSameFormState(current, nextForm) ? current : nextForm,
    );
  }, [filters]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    applyFilters({
      listingType: form.listingType || undefined,
      propertyType: form.propertyType || undefined,
      city: form.city.trim() || undefined,
      neighborhood: form.neighborhood.trim() || undefined,
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
        <h2 className="text-lg font-semibold text-foreground">Filtros</h2>
        <p className="mt-1 text-sm text-muted">
          Refiná tu búsqueda por operación, tipo y ubicación.
        </p>
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Operación</legend>
        <div className="flex flex-wrap gap-2">
          {LISTING_TYPE_OPTIONS.map((option) => {
            const isActive = form.listingType === option.value;

            return (
              <button
                key={option.label}
                type="button"
                onClick={() =>
                  setForm((current) => ({
                    ...current,
                    listingType: option.value,
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-foreground hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Tipo de inmueble</span>
        <select
          value={form.propertyType}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              propertyType: event.target.value as PropertyType | "",
            }))
          }
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {FILTER_PROPERTY_TYPE_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Ciudad</span>
        <input
          type="text"
          value={form.city}
          onChange={(event) =>
            setForm((current) => ({ ...current, city: event.target.value }))
          }
          placeholder="Ej. Buenos Aires"
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Barrio</span>
        <input
          type="text"
          value={form.neighborhood}
          onChange={(event) =>
            setForm((current) => ({
              ...current,
              neighborhood: event.target.value,
            }))
          }
          placeholder="Ej. Palermo"
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-foreground">Moneda</legend>
        <div className="flex gap-2">
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
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                  isActive
                    ? "bg-primary text-white"
                    : "bg-slate-100 text-foreground hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Precio mín.</span>
          <input
            type="number"
            min="0"
            value={form.priceMin}
            onChange={(event) =>
              setForm((current) => ({ ...current, priceMin: event.target.value }))
            }
            placeholder="0"
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Precio máx.</span>
          <input
            type="number"
            min="0"
            value={form.priceMax}
            onChange={(event) =>
              setForm((current) => ({ ...current, priceMax: event.target.value }))
            }
            placeholder="0"
            className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Dormitorios</span>
        <select
          value={form.bedrooms}
          onChange={(event) =>
            setForm((current) => ({ ...current, bedrooms: event.target.value }))
          }
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {ROOM_COUNT_OPTIONS.map((option) => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium text-foreground">Baños</span>
        <select
          value={form.bathrooms}
          onChange={(event) =>
            setForm((current) => ({ ...current, bathrooms: event.target.value }))
          }
          className="h-11 rounded-xl border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          {ROOM_COUNT_OPTIONS.map((option) => (
            <option key={`bath-${option.label}`} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Aplicar filtros
        </button>
        <button
          type="button"
          onClick={() => {
            clearFilters();
            onApplied?.();
          }}
          className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-4 text-sm font-medium text-foreground transition hover:border-primary hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Limpiar filtros
        </button>
      </div>
    </form>
  );
}
