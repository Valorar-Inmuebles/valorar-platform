"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  createPropertyPrice,
  deletePropertyPrice,
  updatePropertyPrice,
} from "@/lib/api/property-price";
import type {
  CreatePropertyPricePayload,
  UpdatePropertyPricePayload,
} from "@/lib/api/types/property-price";

export type PriceActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): PriceActionResult {
  if (error instanceof ApiError) {
    return { ok: false, error: mapPriceApiError(error.message) };
  }
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

function mapPriceApiError(message: string): string {
  if (message.includes("Cannot delete the only price of a publishable")) {
    return "No podés eliminar el único precio de una publicación activa, pausada o reservada.";
  }
  if (message.includes("Cannot demote the only price")) {
    return "Debe existir un precio principal mientras haya precios cargados.";
  }
  if (message.includes("amount must not be less than 0.01")) {
    return "El monto debe ser mayor a 0.";
  }
  return message;
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
