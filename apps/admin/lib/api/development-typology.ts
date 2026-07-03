import { apiFetch } from "@/lib/api/client";
import type {
  AdminDevelopmentTypology,
  CreateDevelopmentTypologyPayload,
  UpdateDevelopmentTypologyPayload,
} from "@/lib/api/types/development-typology";

function buildQuery(extra: Record<string, string>) {
  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listDevelopmentTypologies(
  developmentId: string,
): Promise<AdminDevelopmentTypology[]> {
  return apiFetch<AdminDevelopmentTypology[]>(
    `/development-typologies${buildQuery({ developmentId })}`,
    { cache: "no-store" },
  );
}

export async function getDevelopmentTypology(
  id: string,
): Promise<AdminDevelopmentTypology> {
  return apiFetch<AdminDevelopmentTypology>(`/development-typologies/${id}`, {
    cache: "no-store",
  });
}

export async function createDevelopmentTypology(
  payload: CreateDevelopmentTypologyPayload,
): Promise<AdminDevelopmentTypology> {
  return apiFetch<AdminDevelopmentTypology>("/development-typologies", {
    method: "POST",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function updateDevelopmentTypology(
  id: string,
  payload: UpdateDevelopmentTypologyPayload,
): Promise<AdminDevelopmentTypology> {
  return apiFetch<AdminDevelopmentTypology>(`/development-typologies/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function deleteDevelopmentTypology(
  id: string,
): Promise<AdminDevelopmentTypology> {
  return apiFetch<AdminDevelopmentTypology>(`/development-typologies/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
