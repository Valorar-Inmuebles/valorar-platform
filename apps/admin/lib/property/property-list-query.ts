import type { PropertyListingType, PropertyType } from "@repo/shared-types";
import type { DashboardAttentionFilter } from "@/lib/api/types/dashboard";
import {
  parseAttentionFilter,
  parsePropertyListHref,
} from "@/lib/property/property-list-url";
import type { PropertyCommercialFilter } from "@/lib/property/property-list";

export type PropertyListSort =
  | "updatedAt"
  | "title"
  | "propertyType"
  | "location"
  | "commercialStatus"
  | "createdBy";
export type PropertyListQuery = {
  page: number;
  pageSize: 20 | 50 | 100;
  search?: string;
  commercialStatus: PropertyCommercialFilter;
  propertyType?: PropertyType;
  listingType?: PropertyListingType;
  attention?: DashboardAttentionFilter;
  provinceId?: string;
  localityId?: string;
  neighborhoodId?: string;
  sortBy: PropertyListSort;
  sortOrder: "asc" | "desc";
};
export type PropertyListFilters = PropertyListQuery & {
  provinceName?: string;
  localityName?: string;
  neighborhoodName?: string;
};

const PROPERTY_TYPES = new Set([
  "HOUSE",
  "APARTMENT",
  "PH",
  "OFFICE",
  "COMMERCIAL",
  "WAREHOUSE",
  "INDUSTRIAL",
  "LAND",
  "FIELD",
  "GARAGE",
  "COUNTRY_HOUSE",
  "OTHER",
]);
const LISTING_TYPES = new Set(["SALE", "RENT", "TEMPORARY_RENT"]);
const SORTS = new Set<PropertyListSort>([
  "updatedAt",
  "title",
  "propertyType",
  "location",
  "commercialStatus",
  "createdBy",
]);
type RawParams = Record<string, string | string[] | undefined>;
function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
function positiveInt(
  value: string | undefined,
  fallback: number,
  max: number,
): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const number = Number(value);
  return number >= 1 && number <= max ? number : fallback;
}
function geoId(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function parsePropertyListQuery(raw: RawParams): PropertyListFilters {
  const pageSize = positiveInt(first(raw.pageSize), 20, 100);
  const sort = first(raw.sortBy);
  const propertyType = first(raw.propertyType);
  const listingType = first(raw.listingType);
  return {
    page: positiveInt(first(raw.page), 1, 1_000_000),
    pageSize: ([20, 50, 100] as number[]).includes(pageSize)
      ? (pageSize as 20 | 50 | 100)
      : 20,
    search: first(raw.search)?.trim().slice(0, 160) || undefined,
    commercialStatus: parsePropertyListHref(first(raw.estado)),
    attention: parseAttentionFilter(first(raw.atencion)) ?? undefined,
    propertyType:
      propertyType && PROPERTY_TYPES.has(propertyType)
        ? (propertyType as PropertyType)
        : undefined,
    listingType:
      listingType && LISTING_TYPES.has(listingType)
        ? (listingType as PropertyListingType)
        : undefined,
    provinceId: geoId(first(raw.provinceId)),
    localityId: geoId(first(raw.localityId)),
    neighborhoodId: geoId(first(raw.neighborhoodId)),
    provinceName: first(raw.provinceName),
    localityName: first(raw.localityName),
    neighborhoodName: first(raw.neighborhoodName),
    sortBy:
      sort && SORTS.has(sort as PropertyListSort)
        ? (sort as PropertyListSort)
        : "updatedAt",
    sortOrder: first(raw.sortOrder) === "asc" ? "asc" : "desc",
  };
}

export function propertyListApiPath(query: PropertyListQuery): string {
  const params = new URLSearchParams();
  params.set("page", String(query.page));
  params.set("pageSize", String(query.pageSize));
  params.set("commercialStatus", query.commercialStatus);
  params.set("sortBy", query.sortBy);
  params.set("sortOrder", query.sortOrder);
  for (const key of [
    "search",
    "propertyType",
    "listingType",
    "attention",
    "provinceId",
    "localityId",
    "neighborhoodId",
  ] as const) {
    if (query[key]) params.set(key, query[key]);
  }
  return `/properties/list?${params.toString()}`;
}

export function updatePropertyListParams(
  current: string,
  updates: Record<string, string | number | undefined>,
  resetPage = true,
): string {
  const params = new URLSearchParams(current);
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  if (resetPage) params.delete("page");
  return params.toString();
}

/** A pending search is cancelled when filters change or history navigation wins. */
export function createPropertySearchDebounce(commit: (value: string) => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return {
    schedule(value: string) {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = undefined;
        commit(value.trim().slice(0, 160));
      }, 350);
    },
    cancel() {
      if (timer) clearTimeout(timer);
      timer = undefined;
    },
  };
}
