import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { mapUnknownError } from "@/lib/api/error-map";
import { getPropertyPublishability } from "@/lib/api/property-publishability";
import { listPropertyPrices } from "@/lib/api/property-price";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { CommercializationMutationError } from "@/lib/api/types/commercialization-mutations";
import {
  mapApiPublishabilityToListing,
  type ListingPublishability,
} from "@/lib/property/publishability";
import {
  formatPublicationChecklistMessage,
  isPublicationChecklistErrorBody,
} from "@/lib/property/publication-checklist-error";
import { revalidatePublicWeb } from "@/lib/web/revalidate-public";

export type ListingCommercializationSlice = {
  prices: Awaited<ReturnType<typeof listPropertyPrices>>;
  publishability: ListingPublishability;
};

export async function loadListingCommercializationSlice(
  propertyId: string,
  propertySlug: string,
  listing: AdminPropertyListing,
): Promise<ListingCommercializationSlice> {
  const [prices, api] = await Promise.all([
    listPropertyPrices(listing.id),
    getPropertyPublishability(propertyId, listing.id),
  ]);

  const publishability = mapApiPublishabilityToListing(
    { id: propertyId, slug: propertySlug } as AdminProperty,
    listing,
    api,
  );

  return { prices, publishability };
}

export function revalidateWebOnly(propertySlug?: string) {
  if (propertySlug) {
    void revalidatePublicWeb(propertySlug);
  }
}

export function toCommercializationErrorBody(
  error: unknown,
): CommercializationMutationError {
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

export function toCommercializationErrorResponse(error: unknown): NextResponse {
  const body = toCommercializationErrorBody(error);
  const status = error instanceof ApiError ? error.status : 500;

  return NextResponse.json(body, { status });
}
