"use client";

import { GeoProvinceCombobox } from "@/components/geo/geo-province-combobox";
import {
  GeoLocalitySearch,
  type SelectedLocality,
} from "@/components/geo/geo-locality-search";
import {
  getLocalitiesForProvince,
  getLocalityFieldLabel,
  type SearchCoverage,
} from "@/lib/inventory/search-coverage.types";

type InventoryLocationFiltersProps = {
  coverage: SearchCoverage;
  provinceId: string;
  onProvinceIdChange: (provinceId: string) => void;
  locality: SelectedLocality | null;
  onLocalityChange: (locality: SelectedLocality | null) => void;
  inputClassName?: string;
  allowClearProvince?: boolean;
  provincePlaceholder?: string;
  localityPlaceholder?: string;
  gridClassName?: string;
};

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
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

export function InventoryLocationFilters({
  coverage,
  provinceId,
  onProvinceIdChange,
  locality,
  onLocalityChange,
  inputClassName = "",
  allowClearProvince = true,
  provincePlaceholder = "Todas las provincias",
  localityPlaceholder,
  gridClassName,
}: InventoryLocationFiltersProps) {
  const showProvinceField = !coverage.singleProvince;
  const localityLabel = getLocalityFieldLabel(coverage);
  const effectiveProvinceId = provinceId || coverage.defaultProvinceId || "";
  const resolvedLocalityPlaceholder =
    localityPlaceholder ??
    (coverage.isCabaOnly
      ? "Ej. Palermo, Belgrano…"
      : effectiveProvinceId
        ? "Buscar localidad"
        : "Ej. Palermo, Rosario…");

  return (
    <div
      className={
        gridClassName ??
        (showProvinceField ? "grid gap-3 md:grid-cols-2" : "grid gap-3")
      }
    >
      {showProvinceField ? (
        <FilterSection title="Provincia">
          <GeoProvinceCombobox
            value={provinceId}
            provinces={coverage.provinces}
            allowClear={allowClearProvince}
            placeholder={provincePlaceholder}
            onChange={(nextProvinceId) => {
              onProvinceIdChange(nextProvinceId);
              onLocalityChange(null);
            }}
            inputClassName={inputClassName}
          />
        </FilterSection>
      ) : null}

      <FilterSection title={localityLabel}>
        <GeoLocalitySearch
          value={locality}
          provinceId={effectiveProvinceId || undefined}
          inventoryLocalities={getLocalitiesForProvince(
            coverage,
            effectiveProvinceId || undefined,
          )}
          onChange={(nextLocality) => {
            onLocalityChange(nextLocality);
            if (nextLocality?.provinceId && showProvinceField) {
              onProvinceIdChange(nextLocality.provinceId);
            }
          }}
          placeholder={resolvedLocalityPlaceholder}
          inputClassName={inputClassName}
        />
      </FilterSection>
    </div>
  );
}

export function getInitialProvinceId(coverage: SearchCoverage): string {
  return coverage.defaultProvinceId ?? "";
}
