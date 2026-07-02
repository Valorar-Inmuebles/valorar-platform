import { NextResponse } from "next/server";
import { createPropertyPrice } from "@/lib/api/property-price";
import { getPropertyListing } from "@/lib/api/property-listing";
import {
  loadListingCommercializationSlice,
  revalidateWebOnly,
  toCommercializationErrorResponse,
} from "@/lib/api/commercialization-mutations.server";
import type { CreatePropertyPricePayload } from "@/lib/api/types/property-price";

type RouteContext = {
  params: Promise<{ propertyId: string; listingId: string }>;
};

type MutationBody = {
  propertySlug?: string;
  payload: CreatePropertyPricePayload;
};

function readPropertySlug(body: MutationBody): string | undefined {
  const slug = body.propertySlug?.trim();
  return slug && slug.length > 0 ? slug : undefined;
}

export async function POST(request: Request, context: RouteContext) {
  const { propertyId, listingId } = await context.params;

  let body: MutationBody;

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
      { ok: false, error: "Faltan datos para crear el precio." },
      { status: 400 },
    );
  }

  try {
    await createPropertyPrice(listingId, body.payload);
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
