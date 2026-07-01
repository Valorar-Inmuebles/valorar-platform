"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyType } from "@repo/shared-types";
import { GeoProvinceCombobox } from "@/components/geo/geo-province-combobox";
import {
  GeoLocalitySearch,
  type SelectedLocality,
} from "@/components/geo/geo-locality-search";
import { QUICK_LOCATION_SEARCHES } from "@/lib/constants/quick-searches";
import { searchLocalities } from "@/lib/api/geo";
import {
  buildPropertySearchUrl,
  type SearchTab,
} from "@/lib/url/search-params";
import { PropertyTypeDropdown } from "./property-type-dropdown";

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "sale", label: "Comprar" },
  { id: "rent", label: "Alquiler" },
  { id: "developments", label: "Emprendimientos" },
];

const FIELD_SHELL =
  "rounded-2xl border border-white/20 bg-white/95 shadow-sm backdrop-blur-md";

const INPUT_CLASS =
  "h-12 w-full min-w-0 border-0 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-secondary md:text-base";

export function PropertySearchForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("sale");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [provinceId, setProvinceId] = useState("");
  const [locality, setLocality] = useState<SelectedLocality | null>(null);
  const [quickLoading, setQuickLoading] = useState<string | null>(null);

  const isDevelopmentsTab = activeTab === "developments";

  const submitSearch = (nextLocality = locality) => {
    router.push(
      buildPropertySearchUrl({
        tab: activeTab,
        propertyType: propertyType || undefined,
        provinceId: (nextLocality?.provinceId ?? provinceId) || undefined,
        localityId: nextLocality?.localityId,
        localityName: nextLocality?.localityName,
      }),
    );
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitSearch();
  };

  const handleQuickSearch = async (query: string, label: string) => {
    setQuickLoading(label);
    try {
      const results = await searchLocalities(query, provinceId || undefined);
      const match = results[0];

      if (!match) {
        return;
      }

      const selected: SelectedLocality = {
        provinceId: match.provinceId,
        provinceName: match.provinceName,
        localityId: match.id,
        localityName: match.name,
      };

      setProvinceId(match.provinceId);
      setLocality(selected);
      submitSearch(selected);
    } finally {
      setQuickLoading(null);
    }
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div
        role="tablist"
        aria-label="Operación"
        className={`${FIELD_SHELL} flex w-full gap-1 p-1.5 md:inline-flex md:w-auto`}
      >
        {SEARCH_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`min-h-10 flex-1 rounded-xl px-4 text-sm font-medium transition md:flex-none md:px-5 md:text-base ${
                isActive
                  ? "bg-text-primary text-white shadow-sm"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className={`${FIELD_SHELL} space-y-3 p-4 md:p-5`}
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-white px-3 ring-1 ring-border-default/80">
            <p className="pt-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              Provincia
            </p>
            <GeoProvinceCombobox
              value={provinceId}
              disabled={isDevelopmentsTab}
              placeholder="Ej. Buenos Aires"
              onChange={(nextProvinceId) => {
                setProvinceId(nextProvinceId);
                setLocality(null);
              }}
              inputClassName={INPUT_CLASS}
            />
          </div>

          <div className="rounded-xl bg-white px-3 ring-1 ring-border-default/80">
            <p className="pt-2 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              Localidad
            </p>
            <GeoLocalitySearch
              value={locality}
              provinceId={provinceId || undefined}
              onChange={setLocality}
              disabled={isDevelopmentsTab}
              placeholder={
                provinceId
                  ? "Buscar barrio o localidad"
                  : "Ej. Palermo, Caballito…"
              }
              inputClassName={INPUT_CLASS}
            />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
          <div className="min-w-0">
            <p className="mb-1.5 text-[10px] font-medium uppercase tracking-wide text-text-secondary">
              Tipo de propiedad
            </p>
            <PropertyTypeDropdown
              value={propertyType}
              onChange={setPropertyType}
              disabled={isDevelopmentsTab}
              className="w-full"
            />
          </div>

          <button
            type="submit"
            disabled={isDevelopmentsTab}
            className="inline-flex h-14 w-full items-center justify-center rounded-2xl bg-action-accent px-8 text-base font-semibold text-white transition hover:bg-action-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-accent md:w-auto md:min-w-[10rem]"
          >
            Buscar
          </button>
        </div>
      </form>

      {!isDevelopmentsTab ? (
        <div className="flex flex-wrap items-center gap-2 px-1">
          <span className="text-xs font-medium text-white/75">Búsquedas rápidas:</span>
          {QUICK_LOCATION_SEARCHES.map((item) => (
            <button
              key={item.label}
              type="button"
              disabled={quickLoading !== null}
              onClick={() => handleQuickSearch(item.query, item.label)}
              className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur transition hover:bg-white/25 disabled:opacity-60"
            >
              {quickLoading === item.label ? "…" : item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
