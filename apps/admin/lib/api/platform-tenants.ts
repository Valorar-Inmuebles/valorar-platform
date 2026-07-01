import { apiFetch } from "@/lib/api/client";
import type {
  CreatePlatformTenantPayload,
  PlatformTenant,
  PlatformTenantListResponse,
  PlatformTenantOption,
  PlatformTenantStats,
  UpdatePlatformTenantPayload,
} from "@/lib/api/types/platform-tenant";

export function listPlatformTenants(): Promise<PlatformTenantListResponse> {
  return apiFetch<PlatformTenantListResponse>("/platform/tenants", {
    cache: "no-store",
  });
}

export function getPlatformTenantStats(): Promise<PlatformTenantStats> {
  return apiFetch<PlatformTenantStats>("/platform/tenants/stats", {
    cache: "no-store",
  });
}

export function listPlatformTenantOptions(): Promise<PlatformTenantOption[]> {
  return apiFetch<PlatformTenantOption[]>("/platform/tenants/options", {
    cache: "no-store",
  });
}

export function getPlatformTenant(id: string): Promise<PlatformTenant> {
  return apiFetch<PlatformTenant>(`/platform/tenants/${id}`, {
    cache: "no-store",
  });
}

export function createPlatformTenant(
  payload: CreatePlatformTenantPayload,
): Promise<PlatformTenant> {
  return apiFetch<PlatformTenant>("/platform/tenants", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePlatformTenant(
  id: string,
  payload: UpdatePlatformTenantPayload,
): Promise<PlatformTenant> {
  return apiFetch<PlatformTenant>(`/platform/tenants/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function suspendPlatformTenant(id: string): Promise<PlatformTenant> {
  return apiFetch<PlatformTenant>(`/platform/tenants/${id}/suspend`, {
    method: "POST",
  });
}

export function reactivatePlatformTenant(id: string): Promise<PlatformTenant> {
  return apiFetch<PlatformTenant>(`/platform/tenants/${id}/reactivate`, {
    method: "POST",
  });
}
