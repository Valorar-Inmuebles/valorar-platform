"use server";

import { revalidatePath } from "next/cache";
import type { PublicationCheckKey } from "@repo/property-rules";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  closePropertyListing,
  createPropertyListing,
  updatePropertyListing,
} from "@/lib/api/property-listing";
import type {
  CreatePropertyListingPayload,
  UpdatePropertyListingPayload,
} from "@/lib/api/types/property-listing";
import {
  formatPublicationChecklistMessage,
  isPublicationChecklistErrorBody,
} from "@/lib/property/publication-checklist-error";

export type ListingActionResult =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: string;
      code?: "PUBLICATION_CHECKLIST_INCOMPLETE";
      missing?: PublicationCheckKey[];
    };

function toActionError(error: unknown): ListingActionResult {
  if (error instanceof ApiError) {
    if (isPublicationChecklistErrorBody(error.body)) {
      return {
        ok: false,
        error: formatPublicationChecklistMessage(error.body.missing),
        code: error.body.code,
        missing: error.body.missing,
      };
    }

    return { ok: false, error: mapUnknownError(error) };
  }

  return { ok: false, error: mapUnknownError(error) };
}

function revalidateListingPaths(propertyId: string, listingId?: string) {
  revalidatePath(`/propiedades/${propertyId}`);
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
