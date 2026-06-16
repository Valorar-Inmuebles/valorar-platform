import { apiFetch } from "@/lib/api/client";
import type {
  AdminProperty,
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "@/lib/api/types/property";
import {
  requireAdminTenantId,
  requireAdminUserId,
} from "@/lib/tenant/get-admin-context";

type ListPropertiesOptions = {
  isActive?: boolean;
};

function buildTenantQuery(tenantId: string, extra?: Record<string, string>) {
  const params = new URLSearchParams({ tenantId, ...extra });
  return params.toString();
}

export async function listProperties(
  options: ListPropertiesOptions = {},
): Promise<AdminProperty[]> {
  const tenantId = requireAdminTenantId();
  const extra: Record<string, string> = {};

  if (options.isActive !== undefined) {
    extra.isActive = String(options.isActive);
  }

  return apiFetch<AdminProperty[]>(
    `/properties?${buildTenantQuery(tenantId, extra)}`,
    { cache: "no-store" },
  );
}

export async function getProperty(id: string): Promise<AdminProperty> {
  const tenantId = requireAdminTenantId();
  return apiFetch<AdminProperty>(
    `/properties/${id}?${buildTenantQuery(tenantId)}`,
    { cache: "no-store" },
  );
}

export async function createProperty(
  payload: CreatePropertyPayload,
): Promise<AdminProperty> {
  const tenantId = requireAdminTenantId();
  const createdById = requireAdminUserId();

  return apiFetch<AdminProperty>("/properties", {
    method: "POST",
    body: JSON.stringify({
      tenantId,
      createdById,
      country: "AR",
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updateProperty(
  id: string,
  payload: UpdatePropertyPayload,
): Promise<AdminProperty> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminProperty>(
    `/properties/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(payload),
      cache: "no-store",
    },
  );
}

export async function archiveProperty(id: string): Promise<AdminProperty> {
  const tenantId = requireAdminTenantId();

  return apiFetch<AdminProperty>(
    `/properties/${id}?${buildTenantQuery(tenantId)}`,
    {
      method: "DELETE",
      cache: "no-store",
    },
  );
}
