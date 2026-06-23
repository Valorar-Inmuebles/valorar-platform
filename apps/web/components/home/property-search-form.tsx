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
  "flex h-14 items-center gap-3 rounded-2xl border border-border-default bg-surface-card px-4 md:px-5";

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
    <div className="flex w-full flex-col items-start">
      <div
        role="tablist"
        aria-label="Tipo de búsqueda"
        className="inline-flex w-fit items-center rounded-t-3xl border border-b-0 border-border-default bg-surface-card px-8 pb-3 pt-5 md:px-10"
      >
        {SEARCH_TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;

          return (
            <Fragment key={tab.id}>
              {index > 0 ? (
                <span
                  aria-hidden
                  className="mx-4 inline-block h-4 w-px shrink-0 bg-border-default"
                />
              ) : null}
              <button
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className="inline-flex w-auto pb-2 text-sm font-normal text-text-secondary transition-colors hover:text-text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-action-accent md:text-base"
              >
                <span className="relative inline-block whitespace-nowrap">
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
        className="-mt-px w-full rounded-3xl rounded-tl-none border border-border-default bg-surface-card px-6 py-5 shadow-sm md:px-8"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <PropertyTypeDropdown
            value={propertyType}
            onChange={setPropertyType}
            disabled={isDevelopmentsTab}
            className="md:w-52 lg:w-56"
          />

          <label className={`${FIELD_CONTROL_CLASS} min-w-0 flex-1`}>
            <span className="sr-only">Ubicación</span>
            <LocationIcon size={20} className="shrink-0 text-text-secondary" />
            <input
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Ingresá ubicación, barrio o zona"
              disabled={isDevelopmentsTab}
              aria-label="Ubicación"
              className="min-w-0 flex-1 border-0 bg-transparent text-sm font-normal text-text-primary outline-none placeholder:text-text-secondary disabled:cursor-not-allowed disabled:opacity-50 md:text-base"
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
