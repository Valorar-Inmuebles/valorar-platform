"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import { replacePropertyFeatureAssignments } from "@/lib/api/property-feature-assignment";
import type { ReplacePropertyFeatureAssignmentsPayload } from "@/lib/api/types/property-feature";

export type PropertyFeatureActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toActionError(error: unknown): PropertyFeatureActionResult {
  return { ok: false, error: mapUnknownError(error) };
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
