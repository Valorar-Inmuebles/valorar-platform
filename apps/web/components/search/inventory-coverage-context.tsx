"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SearchCoverage } from "@/lib/inventory/search-coverage.types";

const InventoryCoverageContext = createContext<SearchCoverage | null>(null);

type InventoryCoverageProviderProps = {
  coverage: SearchCoverage;
  children: ReactNode;
};

export function InventoryCoverageProvider({
  coverage,
  children,
}: InventoryCoverageProviderProps) {
  return (
    <InventoryCoverageContext.Provider value={coverage}>
      {children}
    </InventoryCoverageContext.Provider>
  );
}

export function useInventoryCoverage(): SearchCoverage {
  const coverage = useContext(InventoryCoverageContext);

  if (!coverage) {
    throw new Error("useInventoryCoverage must be used within InventoryCoverageProvider");
  }

  return coverage;
}
