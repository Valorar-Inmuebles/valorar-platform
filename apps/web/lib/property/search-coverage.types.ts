export type {
  SearchCoverage,
  SearchCoverageLocality,
  SearchCoverageProvince,
} from "@/lib/inventory/search-coverage.types";

export {
  filterCoverageLocalities,
  findCoverageLocality,
  getLocalitiesForProvince,
  getLocalityFieldLabel,
  getTopLocalitySuggestions,
  isCabaProvince,
  normalizeSearchText,
} from "@/lib/inventory/search-coverage.types";
