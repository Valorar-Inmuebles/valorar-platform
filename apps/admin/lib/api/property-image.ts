import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyImage,
  CreatePropertyImagePayload,
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

export async function getPropertyImage(
  id: string,
): Promise<AdminPropertyImage> {
  return apiFetch<AdminPropertyImage>(`/property-images/${id}`, {
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

export async function deletePropertyImage(
  id: string,
): Promise<AdminPropertyImage> {
  return apiFetch<AdminPropertyImage>(`/property-images/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
