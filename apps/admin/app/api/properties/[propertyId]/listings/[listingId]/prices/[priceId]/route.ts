import { NextResponse } from "next/server";
import {
  deletePropertyPrice,
  updatePropertyPrice,
} from "@/lib/api/property-price";
import { getPropertyListing } from "@/lib/api/property-listing";
import {
  loadListingCommercializationSlice,
  revalidateWebOnly,
  toCommercializationErrorResponse,
} from "@/lib/api/commercialization-mutations.server";
import type { UpdatePropertyPricePayload } from "@/lib/api/types/property-price";

type RouteContext = {
  params: Promise<{ propertyId: string; listingId: string; priceId: string }>;
};

type MutationBody = {
  propertySlug?: string;
  payload?: UpdatePropertyPricePayload;
};

function readPropertySlug(body: MutationBody | null): string | undefined {
  const slug = body?.propertySlug?.trim();
  return slug && slug.length > 0 ? slug : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { propertyId, listingId, priceId } = await context.params;

  let body: MutationBody | null = null;

  try {
    body = (await request.json()) as MutationBody;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Cuerpo de solicitud inválido." },
      { status: 400 },
    );
  }

  if (!body.payload) {
    return NextResponse.json(
      { ok: false, error: "Faltan datos para actualizar el precio." },
      { status: 400 },
    );
  }

  try {
    await updatePropertyPrice(priceId, body.payload);
    const listing = await getPropertyListing(listingId);
    const propertySlug = readPropertySlug(body) ?? "";
    const slice = await loadListingCommercializationSlice(
      propertyId,
      propertySlug,
      listing,
    );

    revalidateWebOnly(body.propertySlug);

    return NextResponse.json({
      ok: true,
      prices: slice.prices,
      publishability: slice.publishability,
    });
  } catch (error) {
    return toCommercializationErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { propertyId, listingId, priceId } = await context.params;

  let propertySlug: string | undefined;

  try {
    const body = (await request.json()) as MutationBody;
    propertySlug = readPropertySlug(body);
  } catch {
    propertySlug = undefined;
  }

  try {
    await deletePropertyPrice(priceId);
    const listing = await getPropertyListing(listingId);
    const slice = await loadListingCommercializationSlice(
      propertyId,
      propertySlug ?? "",
      listing,
    );

    revalidateWebOnly(propertySlug);

    return NextResponse.json({
      ok: true,
      prices: slice.prices,
      publishability: slice.publishability,
    });
  } catch (error) {
    return toCommercializationErrorResponse(error);
  }
}
