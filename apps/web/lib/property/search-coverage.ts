import { getInventorySearchCoverage } from "@/lib/inventory/get-inventory-search-coverage";
import type { SearchCoverage } from "@/lib/inventory/search-coverage.types";

/** @deprecated Use getInventorySearchCoverage("properties") from @/lib/inventory/get-inventory-search-coverage */
export async function getSearchCoverage(): Promise<SearchCoverage> {
  return getInventorySearchCoverage("properties");
}

export type {
  SearchCoverage,
  SearchCoverageLocality,
  SearchCoverageProvince,
} from "@/lib/inventory/search-coverage.types";

export {
  filterCoverageLocalities,
  findCoverageLocality,
  getLocalitiesForProvince,
  isCabaProvince,
  normalizeSearchText,
} from "@/lib/inventory/search-coverage.types";
