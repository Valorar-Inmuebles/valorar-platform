"use server";

import { revalidatePath } from "next/cache";
import {
  createPropertyPrice,
  deletePropertyPrice,
  updatePropertyPrice,
} from "@/lib/api/property-price";
import { mapUnknownError } from "@/lib/api/error-map";
import type {
  CreatePropertyPricePayload,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";
import { revalidatePublicWeb } from "@/lib/web/revalidate-public";

export type PriceActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): PriceActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateCommercializationPaths(
  propertyId: string,
  listingId: string,
  propertySlug?: string,
) {
  revalidatePath(`/propiedades/${propertyId}`);
  revalidatePath(`/propiedades/${propertyId}/publicaciones`);
  revalidatePath(`/propiedades/${propertyId}/publicaciones/${listingId}`);
  revalidatePath(
    `/propiedades/${propertyId}/publicaciones/${listingId}/precios`,
  );

  if (propertySlug) {
    void revalidatePublicWeb(propertySlug);
  }
}

export async function createPropertyPriceAction(
  propertyId: string,
  listingId: string,
  payload: CreatePropertyPricePayload,
  propertySlug?: string,
): Promise<PriceActionResult> {
  try {
    const price = await createPropertyPrice(listingId, payload);
    revalidateCommercializationPaths(propertyId, listingId, propertySlug);
    return { ok: true, id: price.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePropertyPriceAction(
  propertyId: string,
  listingId: string,
  priceId: string,
  payload: UpdatePropertyPricePayload,
  propertySlug?: string,
): Promise<PriceActionResult> {
  try {
    await updatePropertyPrice(priceId, payload);
    revalidateCommercializationPaths(propertyId, listingId, propertySlug);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markPropertyPricePrimaryAction(
  propertyId: string,
  listingId: string,
  priceId: string,
  propertySlug?: string,
): Promise<PriceActionResult> {
  try {
    await updatePropertyPrice(priceId, { isPrimary: true });
    revalidateCommercializationPaths(propertyId, listingId, propertySlug);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePropertyPriceAction(
  propertyId: string,
  listingId: string,
  priceId: string,
  propertySlug?: string,
): Promise<PriceActionResult> {
  try {
    await deletePropertyPrice(priceId);
    revalidateCommercializationPaths(propertyId, listingId, propertySlug);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
