"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  closePropertyListing,
  createPropertyListing,
  updatePropertyListing,
} from "@/lib/api/property-listing";
import type {
  CreatePropertyListingPayload,
  UpdatePropertyListingPayload,
} from "@/lib/api/types/property-listing";

export type ListingActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): ListingActionResult {
  if (error instanceof ApiError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

function revalidateListingPaths(propertyId: string, listingId?: string) {
  revalidatePath(`/propiedades/${propertyId}/publicaciones`);
  if (listingId) {
    revalidatePath(`/propiedades/${propertyId}/publicaciones/${listingId}`);
  }
}

export async function createPropertyListingAction(
  propertyId: string,
  payload: CreatePropertyListingPayload,
): Promise<ListingActionResult> {
  try {
    const listing = await createPropertyListing(propertyId, payload);
    revalidateListingPaths(propertyId, listing.id);
    return { ok: true, id: listing.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePropertyListingAction(
  propertyId: string,
  listingId: string,
  payload: UpdatePropertyListingPayload,
): Promise<ListingActionResult> {
  try {
    await updatePropertyListing(listingId, payload);
    revalidateListingPaths(propertyId, listingId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function closePropertyListingAction(
  propertyId: string,
  listingId: string,
): Promise<ListingActionResult> {
  try {
    await closePropertyListing(listingId);
    revalidateListingPaths(propertyId, listingId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
