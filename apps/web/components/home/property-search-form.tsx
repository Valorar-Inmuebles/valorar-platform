"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import type { PropertyType } from "@repo/shared-types";
import { LocationIcon } from "@/components/icons";
import {
  buildPropertySearchUrl,
  type SearchTab,
} from "@/lib/url/search-params";
import { PropertyTypeDropdown } from "./property-type-dropdown";

const SEARCH_TABS: Array<{ id: SearchTab; label: string }> = [
  { id: "rent", label: "Alquiler" },
  { id: "sale", label: "Comprar" },
  { id: "developments", label: "Emprendimiento" },
];

const FIELD_CONTROL_CLASS =
  "flex h-14 w-full items-center gap-3 rounded-2xl border border-border-default bg-surface-card px-4 md:px-5";

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

  const isDevelopmentsTab = activeTab === "developments";

  return (
    <div className="flex w-full flex-col">
      <div
        role="tablist"
        aria-label="Tipo de búsqueda"
        className="grid w-full grid-cols-3 rounded-t-3xl border border-b-0 border-border-default bg-surface-card px-2 pb-3 pt-4 md:flex md:w-fit md:items-center md:px-8 md:pb-3 md:pt-5 lg:px-10"
      >
        {SEARCH_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <Fragment key={tab.id}>
              {index > 0 ? (
                <span
                  aria-hidden
                  className="mx-4 hidden h-4 w-px shrink-0 bg-border-default md:inline-block"
                />
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className="flex min-h-11 w-full items-center justify-center px-1 pb-2 text-center text-xs font-normal text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action-accent sm:text-sm md:inline-flex md:min-h-0 md:w-auto md:px-0 md:text-base"
              >
                <span className="relative inline-block max-w-full whitespace-normal md:whitespace-nowrap">
                  <span className={isActive ? "font-medium text-text-primary" : undefined}>
                    {tab.label}
                  </span>
                  {isActive ? (
                    <span
                      aria-hidden
                      className="absolute -bottom-2 left-0 right-0 h-0.5 bg-action-accent"
                    />
                  ) : null}
                </span>
              </button>
            </Fragment>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="-mt-px w-full rounded-b-3xl border border-border-default bg-surface-card px-4 py-4 shadow-sm sm:px-6 sm:py-5 md:rounded-3xl md:rounded-tl-none md:px-8"
      >
        <div className="flex w-full flex-col gap-3 md:flex-row md:items-center">
          <PropertyTypeDropdown
            value={propertyType}
            onChange={setPropertyType}
            disabled={isDevelopmentsTab}
            className="w-full md:w-52 lg:w-56"
          />

          <label className={`${FIELD_CONTROL_CLASS} min-w-0 md:flex-1`}>
            <span className="sr-only">Ubicación</span>
            <LocationIcon size={20} className="shrink-0 text-text-secondary" />
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ingresá ubicación, barrio o zona"
              disabled={isDevelopmentsTab}
              aria-label="Ubicación"
              className="min-h-0 min-w-0 flex-1 border-0 bg-transparent text-sm font-normal text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
            />
          </label>

          <button
            type="submit"
            className="inline-flex h-14 w-full shrink-0 items-center justify-center rounded-2xl bg-action-accent px-8 text-base font-semibold text-white transition hover:bg-action-accent/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-action-accent md:w-auto md:min-w-[9.5rem]"
          >
            Buscar
          </button>
        </div>
      </form>
    </div>
  );
}
