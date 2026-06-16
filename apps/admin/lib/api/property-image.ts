import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyImage,
  CreatePropertyImagePayload,
  UpdatePropertyImagePayload,
} from "@/lib/api/types/property-image";
import { requireAdminTenantId } from "@/lib/tenant/get-admin-context";

function buildTenantQuery(tenantId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ tenantId, ...extra });
  return params.toString();
}

export async function listPropertyImages(
  propertyId: string,
): Promise<AdminPropertyImage[]> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyImage[]>(
    `/property-images?${buildTenantQuery(tenantId, { propertyId })}`,
    { cache: "no-store" },
  );
}

export async function getPropertyImage(id: string): Promise<AdminPropertyImage> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyImage>(
    `/property-images/${id}?${buildTenantQuery(tenantId)}`,
    { cache: "no-store" },
  );
}

export async function createPropertyImage(
  propertyId: string,
  payload: CreatePropertyImagePayload,
): Promise<AdminPropertyImage> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyImage>("/property-images", {
    method: "POST",
    body: JSON.stringify({
      tenantId,
      propertyId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updatePropertyImage(
  id: string,
  payload: UpdatePropertyImagePayload,
): Promise<AdminPropertyImage> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyImage>(
    `/property-images/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}

export async function deletePropertyImage(
  id: string,
): Promise<AdminPropertyImage> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyImage>(
    `/property-images/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
}
