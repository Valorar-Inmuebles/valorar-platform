"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  createPropertyImage,
  deletePropertyImage,
  updatePropertyImage,
} from "@/lib/api/property-image";
import type {
  CreatePropertyImagePayload,
  UpdatePropertyImagePayload,
} from "@/lib/api/types/property-image";

export type ImageActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): ImageActionResult {
  if (error instanceof ApiError) {
    return { ok: false, error: mapImageApiError(error.message) };
  }
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

function mapImageApiError(message: string): string {
  if (message.includes("archived property")) {
    return "No podés agregar imágenes a una propiedad archivada. Restaurala primero.";
  }
  return message;
}

function revalidateImagePaths(propertyId: string) {
  revalidatePath(`/propiedades/${propertyId}/imagenes`);
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function createPropertyImageAction(
  propertyId: string,
  payload: CreatePropertyImagePayload,
): Promise<ImageActionResult> {
  try {
    const image = await createPropertyImage(propertyId, payload);
    revalidateImagePaths(propertyId);
    return { ok: true, id: image.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePropertyImageAction(
  propertyId: string,
  imageId: string,
  payload: UpdatePropertyImagePayload,
): Promise<ImageActionResult> {
  try {
    await updatePropertyImage(imageId, payload);
    revalidateImagePaths(propertyId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markPropertyImageCoverAction(
  propertyId: string,
  imageId: string,
): Promise<ImageActionResult> {
  try {
    await updatePropertyImage(imageId, { isCover: true });
    revalidateImagePaths(propertyId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deletePropertyImageAction(
  propertyId: string,
  imageId: string,
): Promise<ImageActionResult> {
  try {
    await deletePropertyImage(imageId);
    revalidateImagePaths(propertyId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
