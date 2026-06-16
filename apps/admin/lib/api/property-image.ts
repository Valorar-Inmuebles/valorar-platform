import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyImage,
  CreatePropertyImagePayload,
  PropertyImageUploadUrlResponse,
  ReorderPropertyImageItem,
  UpdatePropertyImagePayload,
} from "@/lib/api/types/property-image";

function buildQuery(extra: Record<string, string>) {
  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listPropertyImages(
  propertyId: string,
): Promise<AdminPropertyImage[]> {
  return apiFetch<AdminPropertyImage[]>(
    `/property-images${buildQuery({ propertyId })}`,
    { cache: "no-store" },
  );
}

export async function getPropertyImageUploadUrl(
  propertyId: string,
  payload: { mimeType: string; filename?: string },
): Promise<PropertyImageUploadUrlResponse> {
  return apiFetch<PropertyImageUploadUrlResponse>("/property-images/upload-url", {
    method: "POST",
    body: JSON.stringify({
      propertyId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function createPropertyImage(
  propertyId: string,
  payload: CreatePropertyImagePayload,
): Promise<AdminPropertyImage> {
  return apiFetch<AdminPropertyImage>("/property-images", {
    method: "POST",
    body: JSON.stringify({
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
  return apiFetch<AdminPropertyImage>(`/property-images/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function reorderPropertyImages(
  items: ReorderPropertyImageItem[],
): Promise<AdminPropertyImage[]> {
  return apiFetch<AdminPropertyImage[]>("/property-images/reorder", {
    method: "PATCH",
    body: JSON.stringify({ items }),
    cache: "no-store",
  });
}

export async function deletePropertyImage(
  id: string,
): Promise<AdminPropertyImage> {
  return apiFetch<AdminPropertyImage>(`/property-images/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
