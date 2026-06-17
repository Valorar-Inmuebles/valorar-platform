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

export type PriceActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): PriceActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidatePricePaths(propertyId: string, listingId: string) {
  revalidatePath(`/propiedades/${propertyId}/publicaciones/${listingId}/precios`);
  revalidatePath(`/propiedades/${propertyId}/publicaciones/${listingId}`);
  revalidatePath(`/propiedades/${propertyId}/publicaciones`);
}

export async function createPropertyPriceAction(
  propertyId: string,
  listingId: string,
  payload: CreatePropertyPricePayload,
): Promise<PriceActionResult> {
  try {
    const price = await createPropertyPrice(listingId, payload);
    revalidatePricePaths(propertyId, listingId);
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
): Promise<PriceActionResult> {
  try {
    await updatePropertyPrice(priceId, payload);
    revalidatePricePaths(propertyId, listingId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markPropertyPricePrimaryAction(
  propertyId: string,
  listingId: string,
  priceId: string,
): Promise<PriceActionResult> {
  try {
    await updatePropertyPrice(priceId, { isPrimary: true });
    revalidatePricePaths(propertyId, listingId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePropertyPriceAction(
  propertyId: string,
  listingId: string,
  priceId: string,
): Promise<PriceActionResult> {
  try {
    await deletePropertyPrice(priceId);
    revalidatePricePaths(propertyId, listingId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
