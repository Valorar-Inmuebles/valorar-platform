import { NextResponse } from "next/server";
import { updatePropertyPrice } from "@/lib/api/property-price";
import { getPropertyListing } from "@/lib/api/property-listing";
import {
  loadListingCommercializationSlice,
  revalidateWebOnly,
  toCommercializationErrorResponse,
} from "@/lib/api/commercialization-mutations.server";

type RouteContext = {
  params: Promise<{ propertyId: string; listingId: string; priceId: string }>;
};

type MutationBody = {
  propertySlug?: string;
};

function readPropertySlug(body: MutationBody | null): string | undefined {
  const slug = body?.propertySlug?.trim();
  return slug && slug.length > 0 ? slug : undefined;
}

export async function POST(request: Request, context: RouteContext) {
  const { propertyId, listingId, priceId } = await context.params;

  let body: MutationBody | null = null;

  try {
    body = (await request.json()) as MutationBody;
  } catch {
    body = null;
  }

  try {
    await updatePropertyPrice(priceId, { isPrimary: true });
    const listing = await getPropertyListing(listingId);
    const propertySlug = readPropertySlug(body) ?? "";
    const slice = await loadListingCommercializationSlice(
      propertyId,
      propertySlug,
      listing,
    );

    revalidateWebOnly(body?.propertySlug);

    return NextResponse.json({
      ok: true,
      prices: slice.prices,
      publishability: slice.publishability,
    });
  } catch (error) {
    return toCommercializationErrorResponse(error);
  }
}
