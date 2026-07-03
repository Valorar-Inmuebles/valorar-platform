"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  listDevelopmentTypologyFeatureAssignments,
  replaceDevelopmentTypologyFeatureAssignments,
} from "@/lib/api/development-typology-feature-assignment";
import type {
  AdminDevelopmentTypologyFeatureAssignment,
  ReplaceDevelopmentTypologyFeatureAssignmentsPayload,
} from "@/lib/api/types/development-typology-feature";

export type TypologyFeatureActionResult =
  | { ok: true }
  | { ok: false; error: string };

export async function listDevelopmentTypologyFeatureAssignmentsAction(
  typologyId: string,
): Promise<AdminDevelopmentTypologyFeatureAssignment[]> {
  return listDevelopmentTypologyFeatureAssignments(typologyId);
}

export async function replaceDevelopmentTypologyFeatureAssignmentsAction(
  typologyId: string,
  payload: ReplaceDevelopmentTypologyFeatureAssignmentsPayload,
  developmentId?: string,
): Promise<TypologyFeatureActionResult> {
  try {
    await replaceDevelopmentTypologyFeatureAssignments(typologyId, payload);
    if (developmentId) {
      revalidatePath(`/emprendimientos/${developmentId}/tipologias`);
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: mapUnknownError(error) };
  }
}
