"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { replacePropertyFeatureAssignments } from "@/lib/api/property-feature-assignment";
import type { ReplacePropertyFeatureAssignmentsPayload } from "@/lib/api/types/property-feature";

export type PropertyFeatureActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toActionError(error: unknown): PropertyFeatureActionResult {
  if (error instanceof ApiError) {
    return { ok: false, error: error.message };
  }
  if (error instanceof Error) {
    return { ok: false, error: error.message };
  }
  return { ok: false, error: "Ocurrió un error inesperado." };
}

function revalidateFeaturePaths(propertyId: string) {
  revalidatePath(`/propiedades/${propertyId}/caracteristicas`);
  revalidatePath(`/propiedades/${propertyId}`);
}

export async function replacePropertyFeatureAssignmentsAction(
  propertyId: string,
  payload: ReplacePropertyFeatureAssignmentsPayload,
): Promise<PropertyFeatureActionResult> {
  try {
    await replacePropertyFeatureAssignments(propertyId, payload);
    revalidateFeaturePaths(propertyId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
