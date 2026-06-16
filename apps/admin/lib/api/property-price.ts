import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyPrice,
  CreatePropertyPricePayload,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";

function buildQuery(extra: Record<string, string>) {
  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listPropertyPrices(
  listingId: string,
): Promise<AdminPropertyPrice[]> {
  return apiFetch<AdminPropertyPrice[]>(
    `/property-prices${buildQuery({ listingId })}`,
    { cache: "no-store" },
  );
}

export async function getPropertyPrice(
  id: string,
): Promise<AdminPropertyPrice> {
  return apiFetch<AdminPropertyPrice>(`/property-prices/${id}`, {
    cache: "no-store",
  });
}

export async function createPropertyPrice(
  listingId: string,
  payload: CreatePropertyPricePayload,
): Promise<AdminPropertyPrice> {
  return apiFetch<AdminPropertyPrice>("/property-prices", {
    method: "POST",
    body: JSON.stringify({
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
  return apiFetch<AdminPropertyPrice>(`/property-prices/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function deletePropertyPrice(
  id: string,
): Promise<AdminPropertyPrice> {
  return apiFetch<AdminPropertyPrice>(`/property-prices/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
