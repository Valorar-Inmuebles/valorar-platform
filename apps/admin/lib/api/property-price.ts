import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyPrice,
  CreatePropertyPricePayload,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";
import { requireAdminTenantId } from "@/lib/tenant/get-admin-context";

function buildTenantQuery(tenantId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ tenantId, ...extra });
  return params.toString();
}

export async function listPropertyPrices(
  listingId: string,
): Promise<AdminPropertyPrice[]> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyPrice[]>(
    `/property-prices?${buildTenantQuery(tenantId, { listingId })}`,
    { cache: "no-store" },
  );
}

export async function getPropertyPrice(id: string): Promise<AdminPropertyPrice> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyPrice>(
    `/property-prices/${id}?${buildTenantQuery(tenantId)}`,
    { cache: "no-store" },
  );
}

export async function createPropertyPrice(
  listingId: string,
  payload: CreatePropertyPricePayload,
): Promise<AdminPropertyPrice> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyPrice>("/property-prices", {
    method: "POST",
    body: JSON.stringify({
      tenantId,
      listingId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updatePropertyPrice(
  id: string,
  payload: UpdatePropertyPricePayload,
): Promise<AdminPropertyPrice> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyPrice>(
    `/property-prices/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}

export async function deletePropertyPrice(
  id: string,
): Promise<AdminPropertyPrice> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminPropertyPrice>(
    `/property-prices/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
}
