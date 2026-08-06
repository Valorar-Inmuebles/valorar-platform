"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyType } from "@repo/shared-types";
import {
  GeoLocalitySearch,
  type SelectedLocality,
} from "@/components/geo/geo-locality-search";
import {
  getAllCoverageLocations,
  getTopLocationSuggestions,
  type SearchCoverage,
  type SearchCoverageLocation,
} from "@/lib/inventory/search-coverage.types";
import {
  buildPropertySearchUrl,
  type SearchTab,
} from "@/lib/url/search-params";
import { PropertyTypeSelect } from "@/components/search/property-type-select";

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "sale", label: "Venta" },
  { id: "rent", label: "Alquiler" },
  { id: "developments", label: "Emprendimientos" },
];

const FIELD_SHELL =
  "rounded-2xl border border-white/20 bg-white/95 shadow-sm backdrop-blur-md";

const FIELD_BOX = "rounded-xl bg-white px-3 ring-1 ring-border-default/80";

const LABEL_CLASS =
  "pt-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary";

const INPUT_CLASS =
  "h-12 w-full min-w-0 border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary md:text-base";

type PropertySearchFormProps = {
  propertiesCoverage: SearchCoverage;
  developmentsCoverage: SearchCoverage;
};

export function PropertySearchForm({
  propertiesCoverage,
  developmentsCoverage,
}: PropertySearchFormProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("sale");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocality | null>(
    null,
  );
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const isDevelopmentsTab = activeTab === "developments";
  const coverage = isDevelopmentsTab ? developmentsCoverage : propertiesCoverage;

  const inventoryLocations = useMemo(
    () => getAllCoverageLocations(coverage),
    [coverage],
  );

  const locationSuggestions = getTopLocationSuggestions(coverage, 5);

  const submitSearch = (location = selectedLocation) => {
    router.push(
      buildPropertySearchUrl({
        tab: activeTab,
        propertyType: propertyType || undefined,
        location,
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const applyLocationSuggestion = (suggestion: SearchCoverageLocation) => {
    const selected: SelectedLocality =
      suggestion.kind === "province"
        ? {
            provinceId: suggestion.provinceId,
            provinceName: suggestion.provinceName,
            localityName: suggestion.name,
            kind: suggestion.kind,
          }
        : {
            provinceId: suggestion.provinceId,
            provinceName: suggestion.provinceName,
            localityId: suggestion.localityId,
            localityName: suggestion.name,
            neighborhoodId: suggestion.neighborhoodId,
            kind: suggestion.kind,
          };

    setSelectedLocation(selected);
    submitSearch(selected);
  };

  const handleQuickSearch = (suggestion: SearchCoverageLocation) => {
    setQuickLoading(suggestion.id);

    try {
      applyLocationSuggestion(suggestion);
    } finally {
      setQuickLoading(null);
    }
  };

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setSelectedLocation(null);
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex justify-center md:justify-start">
        <div
          role="tablist"
          aria-label="Operación"
          className="inline-flex gap-0.5 rounded-full border border-white/15 bg-black/30 p-1 backdrop-blur-md"
        >
          {SEARCH_TABS.map((tab) => {
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition md:px-5 md:text-base ${
                  isActive
                    ? "bg-white text-text-primary shadow-sm"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className={`relative z-10 ${FIELD_SHELL} space-y-3 p-4 md:p-5`}
      >
        <div
          className={`grid gap-3 md:items-end ${
            isDevelopmentsTab
              ? "md:grid-cols-[minmax(0,1fr)_auto]"
              : "md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]"
          }`}
        >
          {!isDevelopmentsTab ? (
            <div className="min-w-0">
              <div className={FIELD_BOX}>
                <p className={LABEL_CLASS}>Tipo de propiedad</p>
                <PropertyTypeSelect
                  value={propertyType}
                  onChange={setPropertyType}
                  triggerClassName={INPUT_CLASS}
                />
              </div>
            </div>
          ) : null}

          <div className={FIELD_BOX}>
            <p className={LABEL_CLASS}>Ubicación</p>
            <GeoLocalitySearch
              value={selectedLocation}
              inventoryLocations={inventoryLocations}
              onChange={setSelectedLocation}
              placeholder="Buscar provincia, localidad o barrio..."
              inputClassName={INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-2xl bg-action-accent px-8 text-base font-semibold text-white transition hover:bg-action-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-accent md:w-auto md:min-w-[10rem]"
          >
            Buscar
          </button>
        </div>
      </form>

      {locationSuggestions.length > 0 ? (
        <div className="relative z-0 flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-white/75">
            Búsquedas rápidas:
          </span>
          {locationSuggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              disabled={quickLoading !== null}
              onClick={() => handleQuickSearch(suggestion)}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              {quickLoading === suggestion.id ? "…" : suggestion.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
