import type {
  PublicPropertyCard,
  PublicPropertyListResponse,
} from "@repo/shared-types";
import { apiFetch } from "@/lib/api/client";
import { getTenantId } from "@/lib/tenant/get-tenant-id";

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
  const tenantId = getTenantId();

  if (!tenantId) {
    return [];
  }

  try {
    const response = await apiFetch<PublicPropertyListResponse>(
      `/public/properties?tenantId=${encodeURIComponent(tenantId)}&limit=${limit}`,
    );

    return response.data;
  } catch {
    return [];
  }
}
