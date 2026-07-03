"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  createDevelopmentImage,
  deleteDevelopmentImage,
  getDevelopmentImageUploadUrl,
  reorderDevelopmentImages,
  updateDevelopmentImage,
} from "@/lib/api/development-image";
import type {
  CreateDevelopmentImagePayload,
  DevelopmentImageUploadUrlResponse,
  ReorderDevelopmentImageItem,
  UpdateDevelopmentImagePayload,
} from "@/lib/api/types/development-image";

export type ImageActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

export type UploadUrlActionResult =
  | { ok: true; data: DevelopmentImageUploadUrlResponse }
  | { ok: false; error: string };

function toActionError(error: unknown): ImageActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateImagePaths(developmentId: string) {
  revalidatePath(`/emprendimientos/${developmentId}/imagenes`);
  revalidatePath(`/emprendimientos/${developmentId}`);
}

export async function getDevelopmentImageUploadUrlAction(
  developmentId: string,
  payload: { mimeType: string; filename?: string },
): Promise<UploadUrlActionResult> {
  try {
    const data = await getDevelopmentImageUploadUrl(developmentId, payload);
    return { ok: true, data };
  } catch (error) {
    return toActionError(error) as UploadUrlActionResult;
  }
}

export async function createDevelopmentImageAction(
  developmentId: string,
  payload: CreateDevelopmentImagePayload,
): Promise<ImageActionResult> {
  try {
    const image = await createDevelopmentImage(developmentId, payload);
    revalidateImagePaths(developmentId);
    return { ok: true, id: image.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDevelopmentImageAction(
  developmentId: string,
  imageId: string,
  payload: UpdateDevelopmentImagePayload,
): Promise<ImageActionResult> {
  try {
    await updateDevelopmentImage(imageId, payload);
    revalidateImagePaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function markDevelopmentImageCoverAction(
  developmentId: string,
  imageId: string,
): Promise<ImageActionResult> {
  try {
    await updateDevelopmentImage(imageId, { isCover: true });
    revalidateImagePaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function reorderDevelopmentImagesAction(
  developmentId: string,
  items: ReorderDevelopmentImageItem[],
): Promise<ImageActionResult> {
  try {
    await reorderDevelopmentImages(items);
    revalidateImagePaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDevelopmentImageAction(
  developmentId: string,
  imageId: string,
): Promise<ImageActionResult> {
  try {
    await deleteDevelopmentImage(imageId);
    revalidateImagePaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
