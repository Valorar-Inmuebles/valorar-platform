import type {
  AdminDevelopment,
  CreateDevelopmentPayload,
  UpdateDevelopmentPayload,
} from "@/lib/api/types/development";
import { apiFetch } from "@/lib/api/client";

type ListDevelopmentsOptions = {
  isActive?: boolean;
};

function buildQuery(extra?: Record<string, string>) {
  if (!extra || Object.keys(extra).length === 0) {
    return "";
  }

  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listDevelopments(
  options: ListDevelopmentsOptions = {},
): Promise<AdminDevelopment[]> {
  const extra: Record<string, string> = {};

  if (options.isActive !== undefined) {
    extra.isActive = String(options.isActive);
  }

  return apiFetch<AdminDevelopment[]>(`/developments${buildQuery(extra)}`, {
    cache: "no-store",
  });
}

export async function getDevelopment(id: string): Promise<AdminDevelopment> {
  return apiFetch<AdminDevelopment>(`/developments/${id}`, { cache: "no-store" });
}

export async function createDevelopment(
  payload: CreateDevelopmentPayload,
): Promise<AdminDevelopment> {
  return apiFetch<AdminDevelopment>("/developments", {
    method: "POST",
    body: JSON.stringify({
      country: "AR",
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updateDevelopment(
  id: string,
  payload: UpdateDevelopmentPayload,
): Promise<AdminDevelopment> {
  return apiFetch<AdminDevelopment>(`/developments/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function archiveDevelopment(id: string): Promise<AdminDevelopment> {
  return apiFetch<AdminDevelopment>(`/developments/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
