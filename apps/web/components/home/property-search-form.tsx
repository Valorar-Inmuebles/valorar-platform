"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { PropertyType } from "@repo/shared-types";
import { SEARCH_PROPERTY_TYPE_OPTIONS } from "@/lib/format/labels";
import {
  buildPropertySearchUrl,
  type SearchTab,
} from "@/lib/url/search-params";

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "sale", label: "Comprar" },
  { id: "rent", label: "Alquilar" },
  { id: "developments", label: "Emprendimientos" },
];

export function PropertySearchForm() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SearchTab>("sale");
  const [propertyType, setPropertyType] = useState<PropertyType | "">("");
  const [location, setLocation] = useState("");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    router.push(
      buildPropertySearchUrl({
        tab: activeTab,
        propertyType: propertyType || undefined,
        location,
      }),
    );
  };

  return (
    <div className="w-full max-w-4xl rounded-2xl bg-white p-4 shadow-2xl shadow-black/10 ring-1 ring-black/5 md:p-6">
      <div
        role="tablist"
        aria-label="Tipo de búsqueda"
        className="flex flex-wrap gap-2 border-b border-border pb-4"
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
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-slate-100 text-foreground hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Tipo de propiedad</span>
          <select
            value={propertyType}
            onChange={(event) =>
              setPropertyType(event.target.value as PropertyType | "")
            }
            disabled={activeTab === "developments"}
            className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          >
            {SEARCH_PROPERTY_TYPE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-foreground">Ubicación</span>
          <input
            type="text"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            placeholder="Ciudad o barrio"
            disabled={activeTab === "developments"}
            className="h-12 rounded-xl border border-border bg-white px-4 text-sm text-foreground outline-none transition placeholder:text-muted focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-100"
          />
        </label>

        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-white transition hover:bg-primary/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:w-auto"
          >
            Buscar
          </button>
        </div>
      </form>
    </div>
  );
}
