import type { UpdatePropertyListingPayload } from "@/lib/api/types/property-listing";
import type {
  CreatePropertyPricePayload,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";
import type {
  ListingMutationResult,
  ListingPricesMutationResult,
} from "@/lib/api/types/commercialization-mutations";

async function readJsonResponse<T>(response: Response): Promise<T> {
  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  return body as T;
}

function buildMutationInit(
  payload: unknown,
  propertySlug?: string,
): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ payload, propertySlug }),
  };
}

export async function updateListingCommercializationClient(
  propertyId: string,
  listingId: string,
  payload: UpdatePropertyListingPayload,
  propertySlug?: string,
): Promise<ListingMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, propertySlug }),
    },
  );

  return readJsonResponse<ListingMutationResult>(response);
}

export async function closeListingCommercializationClient(
  propertyId: string,
  listingId: string,
  propertySlug?: string,
): Promise<ListingMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertySlug }),
    },
  );

  return readJsonResponse<ListingMutationResult>(response);
}

export async function createPriceCommercializationClient(
  propertyId: string,
  listingId: string,
  payload: CreatePropertyPricePayload,
  propertySlug?: string,
): Promise<ListingPricesMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}/prices`,
    buildMutationInit(payload, propertySlug),
  );

  return readJsonResponse<ListingPricesMutationResult>(response);
}

export async function updatePriceCommercializationClient(
  propertyId: string,
  listingId: string,
  priceId: string,
  payload: UpdatePropertyPricePayload,
  propertySlug?: string,
): Promise<ListingPricesMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}/prices/${priceId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payload, propertySlug }),
    },
  );

  return readJsonResponse<ListingPricesMutationResult>(response);
}

export async function deletePriceCommercializationClient(
  propertyId: string,
  listingId: string,
  priceId: string,
  propertySlug?: string,
): Promise<ListingPricesMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}/prices/${priceId}`,
    {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertySlug }),
    },
  );

  return readJsonResponse<ListingPricesMutationResult>(response);
}

export async function markPricePrimaryCommercializationClient(
  propertyId: string,
  listingId: string,
  priceId: string,
  propertySlug?: string,
): Promise<ListingPricesMutationResult> {
  const response = await fetch(
    `/api/properties/${propertyId}/listings/${listingId}/prices/${priceId}/mark-primary`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertySlug }),
    },
  );

  return readJsonResponse<ListingPricesMutationResult>(response);
}
