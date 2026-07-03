import type {
  PublicDevelopmentCard,
  PublicDevelopmentDetail,
  PublicDevelopmentImage,
  PublicDevelopmentListResponse,
  Currency,
  DevelopmentStatus,
} from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";
import { getTenantId } from "@/lib/tenant/get-tenant-id";
import type { PropertyListFilters } from "@/lib/url/search-params";

type ApiPublicDevelopmentDetail = Omit<
  PublicDevelopmentDetail,
  | "priceFrom"
  | "currency"
  | "hasFinancing"
  | "financingDescription"
  | "hasParkingSpaces"
  | "parkingSpacesCount"
  | "images"
> & {
  commercialization: {
    priceFrom: number | null;
    currency: Currency | null;
    hasFinancing: boolean;
    financingDescription: string | null;
    hasParkingSpaces: boolean;
    parkingSpacesCount: number | null;
  };
  gallery: PublicDevelopmentImage[];
};

function mapPublicDevelopmentDetail(
  detail: ApiPublicDevelopmentDetail,
): PublicDevelopmentDetail {
  return {
    ...detail,
    priceFrom: detail.commercialization.priceFrom,
    currency: detail.commercialization.currency,
    hasFinancing: detail.commercialization.hasFinancing,
    financingDescription: detail.commercialization.financingDescription,
    hasParkingSpaces: detail.commercialization.hasParkingSpaces,
    parkingSpacesCount: detail.commercialization.parkingSpacesCount,
    images: detail.gallery,
  };
}

const EMPTY_LIST_RESPONSE: PublicDevelopmentListResponse = {
  data: [],
  meta: {
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
  },
};

export type PublicDevelopmentsResult = PublicDevelopmentListResponse & {
  unavailable?: boolean;
};

function emptyListResponse(filters: PropertyListFilters): PublicDevelopmentsResult {
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
  if (filters.provinceId) {
    params.set("provinceId", filters.provinceId);
  }

  if (filters.localityId) {
    params.set("localityId", filters.localityId);
  }

  if (filters.neighborhoodId) {
    params.set("neighborhoodId", filters.neighborhoodId);
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
}

export async function getPublicDevelopments(
  filters: PropertyListFilters,
): Promise<PublicDevelopmentsResult> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return { ...emptyListResponse(filters), unavailable: true };
  }

  const params = new URLSearchParams();
  params.set("tenantId", tenantId);
  params.set("page", String(filters.page));
  params.set("limit", String(filters.limit));
  appendFilterParams(params, filters);

  try {
    return await apiFetch<PublicDevelopmentListResponse>(
      `/public/developments?${params.toString()}`,
      { revalidate: 60 },
    );
  } catch {
    return { ...emptyListResponse(filters), unavailable: true };
  }
}

export async function getDevelopmentBySlug(
  slug: string,
): Promise<PublicDevelopmentDetail | null> {
  const tenantId = getTenantId();

  if (!tenantId) {
    return null;
  }

  const params = new URLSearchParams();
  params.set("tenantId", tenantId);

  try {
    const detail = await apiFetch<ApiPublicDevelopmentDetail>(
      `/public/developments/${encodeURIComponent(slug)}?${params.toString()}`,
      { revalidate: 300 },
    );

    return mapPublicDevelopmentDetail(detail);
  } catch {
    return null;
  }
}

export async function getAllPublicDevelopmentSlugs(): Promise<string[]> {
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
      const response = await apiFetch<PublicDevelopmentListResponse>(
        `/public/developments?${params.toString()}`,
        { revalidate: 3600 },
      );

      slugs.push(...response.data.map((development) => development.slug));
      totalPages = response.meta.totalPages;
      page += 1;
    } catch {
      break;
    }
  }

  return slugs;
}

export async function getRecentDevelopments(
  limit = 10,
): Promise<PublicDevelopmentsResult> {
  return getPublicDevelopments({
    page: 1,
    limit,
  });
}
