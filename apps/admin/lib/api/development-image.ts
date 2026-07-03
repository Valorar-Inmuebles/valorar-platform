import { apiFetch } from "@/lib/api/client";
import type {
  AdminDevelopmentImage,
  CreateDevelopmentImagePayload,
  DevelopmentImageUploadUrlResponse,
  ReorderDevelopmentImageItem,
  UpdateDevelopmentImagePayload,
} from "@/lib/api/types/development-image";

function buildQuery(extra: Record<string, string>) {
  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listDevelopmentImages(
  developmentId: string,
): Promise<AdminDevelopmentImage[]> {
  return apiFetch<AdminDevelopmentImage[]>(
    `/development-images${buildQuery({ developmentId })}`,
    { cache: "no-store" },
  );
}

export async function getDevelopmentImageUploadUrl(
  developmentId: string,
  payload: { mimeType: string; filename?: string },
): Promise<DevelopmentImageUploadUrlResponse> {
  return apiFetch<DevelopmentImageUploadUrlResponse>(
    "/development-images/upload-url",
    {
      method: "POST",
      body: JSON.stringify({
        developmentId,
        ...payload,
      }),
      cache: "no-store",
    },
  );
}

export async function createDevelopmentImage(
  developmentId: string,
  payload: CreateDevelopmentImagePayload,
): Promise<AdminDevelopmentImage> {
  return apiFetch<AdminDevelopmentImage>("/development-images", {
    method: "POST",
    body: JSON.stringify({
      developmentId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updateDevelopmentImage(
  id: string,
  payload: UpdateDevelopmentImagePayload,
): Promise<AdminDevelopmentImage> {
  return apiFetch<AdminDevelopmentImage>(`/development-images/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function reorderDevelopmentImages(
  items: ReorderDevelopmentImageItem[],
): Promise<AdminDevelopmentImage[]> {
  return apiFetch<AdminDevelopmentImage[]>("/development-images/reorder", {
    method: "PATCH",
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
}

export async function deleteDevelopmentImage(
  id: string,
): Promise<AdminDevelopmentImage> {
  return apiFetch<AdminDevelopmentImage>(`/development-images/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
