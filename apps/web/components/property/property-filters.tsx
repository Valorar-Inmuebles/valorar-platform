"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import type { Currency, PropertyListingType, PropertyType } from "@repo/shared-types";
import { moneyToInputValue, parseMoneyInput } from "@repo/shared-types/format-money";
import { CurrencyInput } from "@repo/ui/currency-input";
import {
  AMBIENTES_FILTER_OPTIONS,
  BATHROOMS_FILTER_OPTIONS,
} from "@/lib/format/labels";
import { FilterOptionSelect } from "@/components/search/filter-option-select";
import {
  PropertyTypeSelect,
  PROPERTY_TYPE_SELECT_TRIGGER_CLASS,
} from "@/components/search/property-type-select";
import {
  getInitialProvinceId,
  InventoryLocationFilters,
} from "@/components/search/inventory-location-filters";
import { useInventoryCoverage } from "@/components/search/inventory-coverage-context";
import { usePropertyFilters } from "@/hooks/use-property-filters";
import type { SelectedLocality } from "@/components/geo/geo-locality-search";
import {
  locationSelectionToListFilters,
  listFiltersToLocationSelection,
} from "@/lib/url/search-params";

const LISTING_TYPE_OPTIONS: Array<{
  value: PropertyListingType;
  label: string;
}> = [
  { value: "SALE", label: "Venta" },
  { value: "RENT", label: "Alquiler" },
];

const CURRENCY_OPTIONS: Array<{
  value: Currency;
  label: string;
}> = [
  { value: "USD", label: "USD" },
  { value: "ARS", label: "ARS" },
];

const AMENITY_OPTIONS = [
  { id: "brandNew", label: "A estrenar" },
  { id: "professionalUse", label: "Apto profesional" },
  { id: "garage", label: "Cochera" },
  { id: "balcony", label: "Balcón" },
  { id: "terrace", label: "Terraza" },
  { id: "patio", label: "Patio" },
] as const;

type AmenityId = (typeof AMENITY_OPTIONS)[number]["id"];

const FILTER_INPUT = PROPERTY_TYPE_SELECT_TRIGGER_CLASS;

const CHECKBOX_CLASS =
  "size-4 shrink-0 rounded border-border-default accent-brand-green text-brand-green checked:border-brand-green focus:ring-brand-green/30";

type FilterFormState = {
  listingType: PropertyListingType;
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
  const locationSelection = listFiltersToLocationSelection(filters);

  return {
    listingType: filters.listingType ?? "SALE",
    propertyType: filters.propertyType ?? "",
    provinceId: filters.provinceId ?? "",
    locality: locationSelection
      ? {
          provinceId: locationSelection.provinceId,
          provinceName: "",
          localityId: locationSelection.localityId,
          localityName: locationSelection.localityName,
          neighborhoodId: locationSelection.neighborhoodId,
          kind: locationSelection.kind,
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
    a.locality?.neighborhoodId === b.locality?.neighborhoodId &&
    a.locality?.kind === b.locality?.kind &&
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

function FilterCheckbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 text-sm text-text-primary">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className={CHECKBOX_CLASS}
      />
      <span>{label}</span>
    </label>
  );
}

function FilterSegmentControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  value: T | "";
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = value === option.value;
        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green ${
              isActive
                ? "bg-brand-green text-white"
                : "bg-surface-alt text-text-primary hover:bg-surface-base"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

const INITIAL_AMENITIES = Object.fromEntries(
  AMENITY_OPTIONS.map((option) => [option.id, false]),
) as Record<AmenityId, boolean>;

export function PropertyFilters({ onApplied, className = "" }: PropertyFiltersProps) {
  const coverage = useInventoryCoverage();
  const { filters, applyFilters, clearFilters } = usePropertyFilters();
  const [form, setForm] = useState<FilterFormState>(() => ({
    ...filtersToFormState(filters),
    provinceId: filters.provinceId || getInitialProvinceId(coverage),
  }));
  const [creditEligible, setCreditEligible] = useState(false);
  const [amenities, setAmenities] = useState<Record<AmenityId, boolean>>(INITIAL_AMENITIES);

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
      listingType: form.listingType,
      propertyType: form.propertyType || undefined,
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
        <p className="mt-1 text-sm text-muted">
          Seleccioná los filtros para encontrar la propiedad que buscás.
        </p>
      </div>

      <FilterSection title="Tipo de operación">
        <FilterSegmentControl
          options={LISTING_TYPE_OPTIONS}
          value={form.listingType}
          onChange={(listingType) =>
            setForm((current) => ({ ...current, listingType }))
          }
        />
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

      <FilterSection title="Tipo de propiedad">
        <PropertyTypeSelect
          value={form.propertyType}
          onChange={(propertyType) =>
            setForm((current) => ({
              ...current,
              propertyType,
            }))
          }
        />
      </FilterSection>

      <FilterSection title="Moneda">
        <FilterSegmentControl
          options={CURRENCY_OPTIONS}
          value={form.currency}
          onChange={(currency) =>
            setForm((current) => ({ ...current, currency }))
          }
        />
      </FilterSection>

      <FilterSection title="Precio">
        <div className="grid grid-cols-2 gap-2">
          <CurrencyInput
            unstyled
            value={form.priceMin}
            onChange={(value) =>
              setForm((current) => ({ ...current, priceMin: value }))
            }
            placeholder="Desde"
            className={FILTER_INPUT}
          />
          <CurrencyInput
            unstyled
            value={form.priceMax}
            onChange={(value) =>
              setForm((current) => ({ ...current, priceMax: value }))
            }
            placeholder="Hasta"
            className={FILTER_INPUT}
          />
        </div>
        <div className="pt-1">
          <FilterCheckbox
            label="Apto crédito"
            checked={creditEligible}
            onChange={setCreditEligible}
          />
        </div>
      </FilterSection>

      <FilterSection title="Ambientes">
        <FilterOptionSelect
          value={form.bedrooms}
          onChange={(bedrooms) =>
            setForm((current) => ({ ...current, bedrooms }))
          }
          options={[...AMBIENTES_FILTER_OPTIONS]}
          clearLabel="Cualquier cantidad"
          placeholder="Cualquier cantidad"
          triggerClassName={FILTER_INPUT}
          ariaLabel="Ambientes"
        />
      </FilterSection>

      <FilterSection title="Baños">
        <FilterOptionSelect
          value={form.bathrooms}
          onChange={(bathrooms) =>
            setForm((current) => ({ ...current, bathrooms }))
          }
          options={[...BATHROOMS_FILTER_OPTIONS]}
          clearLabel="Cualquier cantidad"
          placeholder="Cualquier cantidad"
          triggerClassName={FILTER_INPUT}
          ariaLabel="Baños"
        />
      </FilterSection>

      <FilterSection title="Comodidades">
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {AMENITY_OPTIONS.map((option) => (
            <FilterCheckbox
              key={option.id}
              label={option.label}
              checked={amenities[option.id]}
              onChange={(checked) =>
                setAmenities((current) => ({
                  ...current,
                  [option.id]: checked,
                }))
              }
            />
          ))}
        </div>
      </FilterSection>

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center rounded-xl bg-brand-green px-4 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          Buscar propiedad
        </button>
        <button
          type="button"
          onClick={() => {
            clearFilters();
            setCreditEligible(false);
            setAmenities(INITIAL_AMENITIES);
            onApplied?.();
          }}
          className="inline-flex h-11 items-center justify-center rounded-xl text-sm font-medium text-text-secondary transition hover:text-brand-green focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
        >
          Limpiar filtros
        </button>
      </div>
    </form>
  );
}
