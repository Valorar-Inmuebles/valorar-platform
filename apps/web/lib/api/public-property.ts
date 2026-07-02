import type {
  PublicPropertyCard,
  PublicPropertyDetail,
  PublicPropertyListResponse,
  PropertyListingType,
  PropertyType,
  Currency,
} from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";
import { isDevelopmentProperty } from "@/lib/inventory/is-development-property";
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

export type PublicPropertiesResult = PublicPropertyListResponse & {
  unavailable?: boolean;
};

export type PublicFeaturedPropertiesResult = {
  data: PublicPropertyCard[];
  unavailable?: boolean;
};

function emptyListResponse(filters: PropertyListFilters): PublicPropertiesResult {
  return {
    ...EMPTY_LIST_RESPONSE,
    meta: {
      ...EMPTY_LIST_RESPONSE.meta,
      page: filters.page,
      limit: filters.limit,
    },
  };
}

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

  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
}

export async function getPublicProperties(
  filters: PropertyListFilters,
): Promise<PublicPropertiesResult> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return emptyListResponse(filters);
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
      ...emptyListResponse(filters),
      unavailable: true,
    };
  }
}

export async function getPublicDevelopments(
  filters: PropertyListFilters,
): Promise<PublicPropertiesResult> {
  const developments: PublicPropertyCard[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const response = await getPublicProperties({
      ...filters,
      page,
      limit: 100,
    });

    if (response.unavailable) {
      return {
        ...emptyListResponse(filters),
        unavailable: true,
      };
    }

    developments.push(...response.data.filter(isDevelopmentProperty));
    totalPages = response.meta.totalPages;
    page += 1;
  }

  const limit = filters.limit;
  const currentPage = filters.page;
  const start = (currentPage - 1) * limit;
  const total = developments.length;
  const totalPagesForDevelopments = total > 0 ? Math.ceil(total / limit) : 0;

  return {
    data: developments.slice(start, start + limit),
    meta: {
      page: currentPage,
      limit,
      total,
      totalPages: totalPagesForDevelopments,
    },
  };
}

export async function getFeaturedProperties(
  limit = 3,
): Promise<PublicFeaturedPropertiesResult> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return { data: [] };
  }

  try {
    const data = await apiFetch<PublicPropertyCard[]>(
      `/public/properties/featured?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
    );

    return { data };
  } catch {
    return { data: [], unavailable: true };
  }
}

export async function getRecentProperties(
  limit = 8,
): Promise<PublicFeaturedPropertiesResult> {
  const response = await getPublicProperties({
    page: 1,
    limit,
  });

  return {
    data: response.data,
    unavailable: response.unavailable,
  };
}

export async function getPropertyBySlug(
  slug: string,
  listingType?: PropertyListingType,
): Promise<PublicPropertyDetail | null> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("tenantId", tenantId);

  if (listingType) {
    params.set("listingType", listingType);
  }

  try {
    return await apiFetch<PublicPropertyDetail>(
      `/public/properties/${encodeURIComponent(slug)}?${params.toString()}`,
      { revalidate: 300 },
    );
  } catch {
    return null;
  }
}

export async function getAllPublicPropertySlugs(): Promise<string[]> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return [];
  }

  const slugs: string[] = [];
  let page = 1;
  let totalPages = 1;
  const limit = 100;

  while (page <= totalPages) {
    const params = new URLSearchParams();
    params.set("tenantId", tenantId);
    params.set("page", String(page));
    params.set("limit", String(limit));

    try {
      const response = await apiFetch<PublicPropertyListResponse>(
        `/public/properties?${params.toString()}`,
        { revalidate: 3600 },
      );

      slugs.push(...response.data.map((property) => property.slug));
      totalPages = response.meta.totalPages;
      page += 1;
    } catch {
      break;
    }
  }

  return slugs;
}

export async function getRelatedProperties(
  property: PublicPropertyDetail,
  limit = 4,
): Promise<PublicPropertyCard[]> {
  const response = await getPublicProperties({
    city: property.city,
    propertyType: property.propertyType,
    page: 1,
    limit: limit + 1,
  });

  if (response.unavailable) {
    return [];
  }

  return response.data
    .filter((item) => item.slug !== property.slug)
    .slice(0, limit);
}

export type { PropertyListingType, PropertyType, Currency };
