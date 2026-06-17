"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  createPropertyImage,
  deletePropertyImage,
  getPropertyImageUploadUrl,
  reorderPropertyImages,
  updatePropertyImage,
} from "@/lib/api/property-image";
import type {
  CreatePropertyImagePayload,
  PropertyImageUploadUrlResponse,
  ReorderPropertyImageItem,
  UpdatePropertyImagePayload,
} from "@/lib/api/types/property-image";

export type ImageActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export type UploadUrlActionResult =
  | { ok: true; data: PropertyImageUploadUrlResponse }
  | { ok: false; error: string };

function toActionError(error: unknown): ImageActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateImagePaths(propertyId: string) {
  revalidatePath(`/propiedades/${propertyId}/imagenes`);
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function getPropertyImageUploadUrlAction(
  propertyId: string,
  payload: { mimeType: string; filename?: string },
): Promise<UploadUrlActionResult> {
  try {
    const data = await getPropertyImageUploadUrl(propertyId, payload);
    return { ok: true, data };
  } catch (error) {
    return toActionError(error) as UploadUrlActionResult;
  }
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

export async function reorderPropertyImagesAction(
  propertyId: string,
  items: ReorderPropertyImageItem[],
): Promise<ImageActionResult> {
  try {
    await reorderPropertyImages(items);
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
