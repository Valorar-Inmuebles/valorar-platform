import type {
  PublicPropertyCard,
  PublicPropertyListResponse,
  PropertyListingType,
  PropertyType,
  Currency,
} from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";
import { getTenantId } from "@/lib/tenant/get-tenant-id";
import type { PropertyListFilters } from "@/lib/url/search-params";

const EMPTY_LIST_RESPONSE: PublicPropertyListResponse = {
  data: [],
  meta: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
};

function appendFilterParams(
  params: URLSearchParams,
  filters: PropertyListFilters,
): void {
  if (filters.listingType) {
    params.set("listingType", filters.listingType);
  }

  if (filters.propertyType) {
    params.set("propertyType", filters.propertyType);
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

  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
}

export async function getPublicProperties(
  filters: PropertyListFilters,
): Promise<PublicPropertyListResponse> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return {
      ...EMPTY_LIST_RESPONSE,
      meta: {
        ...EMPTY_LIST_RESPONSE.meta,
        page: filters.page,
        limit: filters.limit,
      },
    };
  }

  const params = new URLSearchParams();
  params.set("tenantId", tenantId);
  appendFilterParams(params, filters);

  try {
    return await apiFetch<PublicPropertyListResponse>(
      `/public/properties?${params.toString()}`,
      { revalidate: 60 },
    );
  } catch {
    return {
      ...EMPTY_LIST_RESPONSE,
      meta: {
        ...EMPTY_LIST_RESPONSE.meta,
        page: filters.page,
        limit: filters.limit,
      },
    };
  }
}

export async function getFeaturedProperties(
  limit = 3,
): Promise<PublicPropertyCard[]> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return [];
  }

  try {
    return await apiFetch<PublicPropertyCard[]>(
      `/public/properties/featured?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
    );
  } catch {
    return [];
  }
}

export async function getRecentProperties(
  limit = 8,
): Promise<PublicPropertyCard[]> {
  const response = await getPublicProperties({
    page: 1,
    limit,
  });

  return response.data;
}

export type { PropertyListingType, PropertyType, Currency };
