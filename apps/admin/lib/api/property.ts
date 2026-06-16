import type {
  AdminProperty,
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "@/lib/api/types/property";
import { apiFetch } from "@/lib/api/client";

type ListPropertiesOptions = {
  isActive?: boolean;
};

function buildQuery(extra?: Record<string, string>) {
  if (!extra || Object.keys(extra).length === 0) {
    return "";
  }

  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listProperties(
  options: ListPropertiesOptions = {},
): Promise<AdminProperty[]> {
  const extra: Record<string, string> = {};

  if (options.isActive !== undefined) {
    extra.isActive = String(options.isActive);
  }

  return apiFetch<AdminProperty[]>(`/properties${buildQuery(extra)}`, {
    cache: "no-store",
  });
}

export async function getProperty(id: string): Promise<AdminProperty> {
  return apiFetch<AdminProperty>(`/properties/${id}`, { cache: "no-store" });
}

export async function createProperty(
  payload: CreatePropertyPayload,
): Promise<AdminProperty> {
  return apiFetch<AdminProperty>("/properties", {
    method: "POST",
    body: JSON.stringify({
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
  return apiFetch<AdminProperty>(`/properties/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function archiveProperty(id: string): Promise<AdminProperty> {
  return apiFetch<AdminProperty>(`/properties/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
