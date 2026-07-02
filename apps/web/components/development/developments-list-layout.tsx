import type { ReactNode } from "react";
import { Suspense } from "react";
import { InventoryCoverageProvider } from "@/components/search/inventory-coverage-context";
import { getInventorySearchCoverage } from "@/lib/inventory/get-inventory-search-coverage";
import { DevelopmentActiveFiltersBar } from "./development-active-filters-bar";
import { DevelopmentFilters } from "./development-filters";
import { DevelopmentMobileFiltersButton } from "./development-mobile-filters-button";

function FiltersSidebarFallback() {
  return (
    <div className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-sm">
      <div className="h-6 w-24 animate-pulse rounded bg-surface-alt" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
      <div className="h-11 w-full animate-pulse rounded-xl bg-surface-alt" />
    </div>
  );
}

type DevelopmentsListLayoutProps = {
  children: ReactNode;
};

export async function DevelopmentsListLayout({
  children,
}: DevelopmentsListLayoutProps) {
  const coverage = await getInventorySearchCoverage("developments");

  return (
    <InventoryCoverageProvider coverage={coverage}>
      <div className="grid gap-8 lg:grid-cols-[18rem_minmax(0,1fr)] xl:grid-cols-[20rem_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <Suspense fallback={<FiltersSidebarFallback />}>
              <DevelopmentFilters />
            </Suspense>
          </div>
        </aside>

        <div className="min-w-0">
          <Suspense fallback={null}>
            <DevelopmentMobileFiltersButton />
          </Suspense>
          <Suspense fallback={null}>
            <DevelopmentActiveFiltersBar />
          </Suspense>
          {children}
        </div>
      </div>
    </InventoryCoverageProvider>
  );
}
