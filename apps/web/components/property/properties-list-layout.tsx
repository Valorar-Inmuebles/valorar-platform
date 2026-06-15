import type { ReactNode } from "react";
import { Suspense } from "react";
import { ActiveFiltersBar } from "./active-filters-bar";
import { MobileFiltersButton } from "./mobile-filters-button";
import { PropertyFilters } from "./property-filters";

function FiltersSidebarFallback() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="h-6 w-24 animate-pulse rounded bg-slate-200" />
      <div className="h-4 w-full animate-pulse rounded bg-slate-200" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-slate-200" />
    </div>
  );
}

type PropertiesListLayoutProps = {
  children: ReactNode;
};

export function PropertiesListLayout({ children }: PropertiesListLayoutProps) {
  return (
    <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
      <aside className="hidden lg:block">
        <div className="sticky top-24">
          <Suspense fallback={<FiltersSidebarFallback />}>
            <PropertyFilters />
          </Suspense>
        </div>
      </aside>

      <div className="min-w-0">
        <Suspense fallback={null}>
          <MobileFiltersButton />
        </Suspense>
        <Suspense fallback={null}>
          <ActiveFiltersBar />
        </Suspense>
        {children}
      </div>
    </div>
  );
}
