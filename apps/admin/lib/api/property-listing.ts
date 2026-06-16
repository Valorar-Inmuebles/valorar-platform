import { apiFetch } from "@/lib/api/client";
import type {
  AdminPropertyListing,
  CreatePropertyListingPayload,
  UpdatePropertyListingPayload,
} from "@/lib/api/types/property-listing";

type ListPropertyListingsOptions = {
  propertyId?: string;
  listingType?: string;
  status?: string;
};

function buildQuery(extra?: Record<string, string>) {
  if (!extra || Object.keys(extra).length === 0) {
    return "";
  }

  return `?${new URLSearchParams(extra).toString()}`;
}

export async function listPropertyListings(
  options: ListPropertyListingsOptions = {},
): Promise<AdminPropertyListing[]> {
  const extra: Record<string, string> = {};

  if (options.propertyId) extra.propertyId = options.propertyId;
  if (options.listingType) extra.listingType = options.listingType;
  if (options.status) extra.status = options.status;

  return apiFetch<AdminPropertyListing[]>(
    `/property-listings${buildQuery(extra)}`,
    { cache: "no-store" },
  );
}

export async function getPropertyListing(
  id: string,
): Promise<AdminPropertyListing> {
  return apiFetch<AdminPropertyListing>(`/property-listings/${id}`, {
    cache: "no-store",
  });
}

export async function createPropertyListing(
  propertyId: string,
  payload: CreatePropertyListingPayload,
): Promise<AdminPropertyListing> {
  return apiFetch<AdminPropertyListing>("/property-listings", {
    method: "POST",
    body: JSON.stringify({
      propertyId,
      ...payload,
    }),
    cache: "no-store",
  });
}

export async function updatePropertyListing(
  id: string,
  payload: UpdatePropertyListingPayload,
): Promise<AdminPropertyListing> {
  return apiFetch<AdminPropertyListing>(`/property-listings/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
    cache: "no-store",
  });
}

export async function closePropertyListing(
  id: string,
): Promise<AdminPropertyListing> {
  return apiFetch<AdminPropertyListing>(`/property-listings/${id}`, {
    method: "DELETE",
    cache: "no-store",
  });
}
