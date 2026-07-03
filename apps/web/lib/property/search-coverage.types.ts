export type {
  SearchCoverage,
  SearchCoverageLocality,
  SearchCoverageLocation,
  SearchCoverageLocationKind,
  SearchCoverageProvince,
} from "@/lib/inventory/search-coverage.types";

export {
  filterCoverageLocalities,
  filterCoverageLocations,
  findCoverageLocality,
  getAllCoverageLocations,
  getLocalitiesForProvince,
  getLocalityFieldLabel,
  getLocationKindIcon,
  getLocationKindLabel,
  getTopLocalitySuggestions,
  getTopLocationSuggestions,
  isCabaProvince,
  normalizeSearchText,
} from "@/lib/inventory/search-coverage.types";
