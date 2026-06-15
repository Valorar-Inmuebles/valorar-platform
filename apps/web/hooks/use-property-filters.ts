"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import {
  buildPropertyListUrl,
  parsePropertyListSearchParams,
  type PropertyListFilters,
} from "@/lib/url/search-params";

export function usePropertyFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const filters = parsePropertyListSearchParams(
    Object.fromEntries(searchParams.entries()),
  );

  const applyFilters = useCallback(
    (nextFilters: Partial<PropertyListFilters>) => {
      const url = buildPropertyListUrl({
        ...filters,
        ...nextFilters,
        page: 1,
      });

      router.push(url);
    },
    [filters, router],
  );

  const clearFilters = useCallback(() => {
    router.push("/propiedades");
  }, [router]);

  const goToPage = useCallback(
    (page: number) => {
      router.push(
        buildPropertyListUrl({
          ...filters,
          page,
        }),
      );
    },
    [filters, router],
  );

  return {
    filters,
    applyFilters,
    clearFilters,
    goToPage,
  };
}
