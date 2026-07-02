import type {
  Currency,
  PropertyListingType,
  PropertyType,
} from "@repo/shared-types";

export type PropertyListFilters = {
  listingType?: PropertyListingType;
  propertyType?: PropertyType;
  provinceId?: string;
  localityId?: string;
  city?: string;
  neighborhood?: string;
  priceMin?: number;
  priceMax?: number;
  currency?: Currency;
  bedrooms?: number;
  bathrooms?: number;
  page: number;
  limit: number;
};

export const DEFAULT_PROPERTY_LIST_FILTERS: PropertyListFilters = {
  page: 1,
  limit: 12,
};

const LISTING_TYPES: PropertyListingType[] = ["SALE", "RENT", "TEMPORARY_RENT"];
const CURRENCIES: Currency[] = ["ARS", "USD"];
const PROPERTY_TYPES: PropertyType[] = [
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
];

function getSingleParam(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | undefined {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parseOptionalFloat(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  if (Number.isNaN(parsed) || parsed < 0) {
    return undefined;
  }

  return parsed;
}

function parseListingType(value: string | undefined): PropertyListingType | undefined {
  if (!value) {
    return undefined;
  }

  return LISTING_TYPES.includes(value as PropertyListingType)
    ? (value as PropertyListingType)
    : undefined;
}

function parsePropertyType(value: string | undefined): PropertyType | undefined {
  if (!value) {
    return undefined;
  }

  return PROPERTY_TYPES.includes(value as PropertyType)
    ? (value as PropertyType)
    : undefined;
}

function parseCurrency(value: string | undefined): Currency | undefined {
  if (!value) {
    return undefined;
  }

  return CURRENCIES.includes(value as Currency) ? (value as Currency) : undefined;
}

export function parsePropertyListSearchParams(
  params: Record<string, string | string[] | undefined>,
): PropertyListFilters {
  const page = parseOptionalInt(getSingleParam(params, "page")) ?? 1;
  const limit = parseOptionalInt(getSingleParam(params, "limit")) ?? 12;

  return {
    listingType: parseListingType(getSingleParam(params, "listingType")),
    propertyType: parsePropertyType(getSingleParam(params, "propertyType")),
    provinceId: getSingleParam(params, "provinceId")?.trim() || undefined,
    localityId: getSingleParam(params, "localityId")?.trim() || undefined,
    city: getSingleParam(params, "city")?.trim() || undefined,
    neighborhood: getSingleParam(params, "neighborhood")?.trim() || undefined,
    priceMin: parseOptionalFloat(getSingleParam(params, "priceMin")),
    priceMax: parseOptionalFloat(getSingleParam(params, "priceMax")),
    currency: parseCurrency(getSingleParam(params, "currency")),
    bedrooms: parseOptionalInt(getSingleParam(params, "bedrooms")),
    bathrooms: parseOptionalInt(getSingleParam(params, "bathrooms")),
    page: page > 0 ? page : 1,
    limit: limit > 0 && limit <= 100 ? limit : 12,
  };
}

export function buildInventoryListUrl(
  basePath: string,
  filters: Partial<PropertyListFilters>,
): string {
  const params = new URLSearchParams();

  if (filters.listingType) {
    params.set("listingType", filters.listingType);
  }

  if (filters.propertyType) {
    params.set("propertyType", filters.propertyType);
  }

  if (filters.provinceId) {
    params.set("provinceId", filters.provinceId);
  }

  if (filters.localityId) {
    params.set("localityId", filters.localityId);
  }

  if (filters.city) {
    params.set("city", filters.city);
  }

  if (filters.neighborhood) {
    params.set("neighborhood", filters.neighborhood);
  }

  if (filters.priceMin != null) {
    params.set("priceMin", String(filters.priceMin));
  }

  if (filters.priceMax != null) {
    params.set("priceMax", String(filters.priceMax));
  }

  if (filters.currency) {
    params.set("currency", filters.currency);
  }

  if (filters.bedrooms != null) {
    params.set("bedrooms", String(filters.bedrooms));
  }

  if (filters.bathrooms != null) {
    params.set("bathrooms", String(filters.bathrooms));
  }

  if (filters.page && filters.page > 1) {
    params.set("page", String(filters.page));
  }

  if (filters.limit && filters.limit !== DEFAULT_PROPERTY_LIST_FILTERS.limit) {
    params.set("limit", String(filters.limit));
  }

  const query = params.toString();

  return query ? `${basePath}?${query}` : basePath;
}

export function buildPropertyListUrl(
  filters: Partial<PropertyListFilters>,
): string {
  return buildInventoryListUrl("/propiedades", filters);
}

export function buildDevelopmentListUrl(
  filters: Partial<PropertyListFilters>,
): string {
  return buildInventoryListUrl("/emprendimientos", filters);
}

export function hasActivePropertyListFilters(
  filters: PropertyListFilters,
): boolean {
  return Boolean(
    filters.listingType ||
      filters.propertyType ||
      filters.provinceId ||
      filters.localityId ||
      filters.city ||
      filters.neighborhood ||
      filters.priceMin != null ||
      filters.priceMax != null ||
      filters.currency ||
      filters.bedrooms != null ||
      filters.bathrooms != null,
  );
}

export function hasActiveLocationFilters(
  filters: PropertyListFilters,
): boolean {
  return Boolean(
    filters.provinceId ||
      filters.localityId ||
      filters.city ||
      filters.neighborhood,
  );
}

export type SearchTab = "sale" | "rent" | "developments";

export type PropertySearchParams = {
  tab: SearchTab;
  propertyType?: PropertyType;
  location?: string;
  provinceId?: string;
  localityId?: string;
  localityName?: string;
};

export function buildPropertySearchUrl({
  tab,
  propertyType,
  location,
  provinceId,
  localityId,
  localityName,
}: PropertySearchParams): string {
  if (tab === "developments") {
    return "/emprendimientos";
  }

  return buildPropertyListUrl({
    listingType: tab === "rent" ? "RENT" : "SALE",
    propertyType,
    provinceId,
    localityId,
    city: localityName?.trim() || location?.trim() || undefined,
    page: 1,
    limit: DEFAULT_PROPERTY_LIST_FILTERS.limit,
  });
}

export function listingTypeFromTab(tab: SearchTab): PropertyListingType | null {
  if (tab === "rent") {
    return "RENT";
  }

  if (tab === "sale") {
    return "SALE";
  }

  return null;
}
