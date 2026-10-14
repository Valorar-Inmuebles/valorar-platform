"use server";

import { apiFetch, ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import type {
  PropertyLocationSearchPayload,
  PropertyLocationSearchResult,
} from "./types/property-location-search";

export type LocationSearchActionResult =
  | { ok: true; result: PropertyLocationSearchResult }
  | { ok: false; error: string; retryAfterSeconds?: number };

const optionalAddressFields = [
  "streetNumber",
  "provinceId",
  "localityId",
  "neighborhoodId",
  "province",
  "city",
  "neighborhood",
  "postalCode",
] as const;

export async function searchPropertyLocationAction(
  payload: PropertyLocationSearchPayload,
  propertyId?: string,
): Promise<LocationSearchActionResult> {
  try {
    const address = { ...payload };
    for (const field of optionalAddressFields) {
      if (address[field] === "") delete address[field];
    }
    const path = propertyId
      ? `/properties/${encodeURIComponent(propertyId)}/location-search`
      : "/properties/location-search";
    const result = await apiFetch<PropertyLocationSearchResult>(path, {
      method: "POST",
      body: JSON.stringify(address),
      cache: "no-store",
    });
    return { ok: true, result };
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      const body =
        error.body && typeof error.body === "object"
          ? (error.body as Record<string, unknown>)
          : {};
      const seconds =
        typeof body.retryAfterSeconds === "number" &&
        Number.isFinite(body.retryAfterSeconds)
          ? body.retryAfterSeconds
          : undefined;
      return {
        ok: false,
        error: "Demasiadas búsquedas. Intentá más tarde.",
        ...(seconds ? { retryAfterSeconds: seconds } : {}),
      };
    }
    return { ok: false, error: mapUnknownError(error) };
  }
}
