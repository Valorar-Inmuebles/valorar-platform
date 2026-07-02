import { NextResponse } from "next/server";
import {
  closePropertyListing,
  updatePropertyListing,
} from "@/lib/api/property-listing";
import {
  loadListingCommercializationSlice,
  revalidateWebOnly,
  toCommercializationErrorResponse,
} from "@/lib/api/commercialization-mutations.server";
import type { UpdatePropertyListingPayload } from "@/lib/api/types/property-listing";

type RouteContext = {
  params: Promise<{ propertyId: string; listingId: string }>;
};

type MutationBody = {
  propertySlug?: string;
  payload?: UpdatePropertyListingPayload;
};

function readPropertySlug(body: MutationBody | null): string | undefined {
  const slug = body?.propertySlug?.trim();
  return slug && slug.length > 0 ? slug : undefined;
}

export async function PATCH(request: Request, context: RouteContext) {
  const { propertyId, listingId } = await context.params;

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
      { ok: false, error: "Faltan datos para actualizar la operación." },
      { status: 400 },
    );
  }

  try {
    const listing = await updatePropertyListing(listingId, body.payload);
    const propertySlug = readPropertySlug(body) ?? "";
    const { publishability } = await loadListingCommercializationSlice(
      propertyId,
      propertySlug,
      listing,
    );

    revalidateWebOnly(body.propertySlug);

    return NextResponse.json({
      ok: true,
      listing,
      publishability,
    });
  } catch (error) {
    return toCommercializationErrorResponse(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const { propertyId, listingId } = await context.params;

  let propertySlug: string | undefined;

  try {
    const body = (await request.json()) as MutationBody;
    propertySlug = readPropertySlug(body);
  } catch {
    propertySlug = undefined;
  }

  try {
    const listing = await closePropertyListing(listingId);
    const { publishability } = await loadListingCommercializationSlice(
      propertyId,
      propertySlug ?? "",
      listing,
    );

    revalidateWebOnly(propertySlug);

    return NextResponse.json({
      ok: true,
      listing,
      publishability,
    });
  } catch (error) {
    return toCommercializationErrorResponse(error);
  }
}
