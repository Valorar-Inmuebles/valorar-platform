import type { ReactNode } from "react";
import { Suspense } from "react";
import { InventoryCoverageProvider } from "@/components/search/inventory-coverage-context";
import { getInventorySearchCoverage } from "@/lib/inventory/get-inventory-search-coverage";
import { ActiveFiltersBar } from "./active-filters-bar";
import { MobileFiltersButton } from "./mobile-filters-button";
import { PropertiesFiltersHelpCta } from "./properties-filters-help-cta";
import { PropertyFilters } from "./property-filters";

function FiltersSidebarFallback() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="h-6 w-24 animate-pulse rounded bg-surface-alt" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
    </div>
  );
}

type PropertiesListLayoutProps = {
  children: ReactNode;
};

export async function PropertiesListLayout({ children }: PropertiesListLayoutProps) {
  const coverage = await getInventorySearchCoverage("properties");

  return (
    <InventoryCoverageProvider coverage={coverage}>
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-4">
            <Suspense fallback={<FiltersSidebarFallback />}>
              <PropertyFilters />
            </Suspense>
            <PropertiesFiltersHelpCta />
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
    </InventoryCoverageProvider>
  );
}
