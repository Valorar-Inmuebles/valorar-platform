"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
  buildInventoryListUrl,
  parsePropertyListSearchParams,
  type PropertyListFilters,
} from "@/lib/url/search-params";

type ListFiltersBasePath = "/propiedades" | "/emprendimientos";

function useListFilters(basePath: ListFiltersBasePath) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();

  const filters = useMemo(
    () =>
      parsePropertyListSearchParams(
        Object.fromEntries(searchParams.entries()),
      ),
    [searchParamsKey],
  );

  const buildUrl = useCallback(
    (nextFilters: Partial<PropertyListFilters>) =>
      buildInventoryListUrl(basePath, nextFilters),
    [basePath],
  );

  const applyFilters = useCallback(
    (nextFilters: Partial<PropertyListFilters>) => {
      router.push(
        buildUrl({
          ...filters,
          ...nextFilters,
          page: 1,
        }),
      );
    },
    [buildUrl, filters, router],
  );

  const clearFilters = useCallback(() => {
    router.push(basePath);
  }, [basePath, router]);

  const goToPage = useCallback(
    (page: number) => {
      router.push(
        buildUrl({
          ...filters,
          page,
        }),
      );
    },
    [buildUrl, filters, router],
  );

  return {
    filters,
    applyFilters,
    clearFilters,
    goToPage,
  };
}

export function usePropertyFilters() {
  return useListFilters("/propiedades");
}

export function useDevelopmentFilters() {
  return useListFilters("/emprendimientos");
}
