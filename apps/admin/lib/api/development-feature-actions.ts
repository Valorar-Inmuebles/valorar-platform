"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import { replaceDevelopmentFeatureAssignments } from "@/lib/api/development-feature-assignment";
import type { ReplacePropertyFeatureAssignmentsPayload } from "@/lib/api/types/property-feature";

export type DevelopmentFeatureActionResult =
  | { ok: true }
  | { ok: false; error: string };

function toActionError(error: unknown): DevelopmentFeatureActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateFeaturePaths(developmentId: string) {
  revalidatePath(`/emprendimientos/${developmentId}/caracteristicas`);
  revalidatePath(`/emprendimientos/${developmentId}`);
}

export async function replaceDevelopmentFeatureAssignmentsAction(
  developmentId: string,
  payload: ReplacePropertyFeatureAssignmentsPayload,
): Promise<DevelopmentFeatureActionResult> {
  try {
    await replaceDevelopmentFeatureAssignments(developmentId, payload);
    revalidateFeaturePaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
