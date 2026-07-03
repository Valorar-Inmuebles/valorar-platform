"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  createDevelopmentTypology,
  deleteDevelopmentTypology,
  updateDevelopmentTypology,
} from "@/lib/api/development-typology";
import type {
  CreateDevelopmentTypologyPayload,
  UpdateDevelopmentTypologyPayload,
} from "@/lib/api/types/development-typology";

export type DevelopmentTypologyActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): DevelopmentTypologyActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateTypologyPaths(developmentId: string) {
  revalidatePath(`/emprendimientos/${developmentId}/tipologias`);
  revalidatePath(`/emprendimientos/${developmentId}`);
}

export async function createDevelopmentTypologyAction(
  payload: CreateDevelopmentTypologyPayload,
): Promise<DevelopmentTypologyActionResult> {
  try {
    const typology = await createDevelopmentTypology(payload);
    revalidateTypologyPaths(payload.developmentId);
    return { ok: true, id: typology.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDevelopmentTypologyAction(
  developmentId: string,
  typologyId: string,
  payload: UpdateDevelopmentTypologyPayload,
): Promise<DevelopmentTypologyActionResult> {
  try {
    await updateDevelopmentTypology(typologyId, payload);
    revalidateTypologyPaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function deleteDevelopmentTypologyAction(
  developmentId: string,
  typologyId: string,
): Promise<DevelopmentTypologyActionResult> {
  try {
    await deleteDevelopmentTypology(typologyId);
    revalidateTypologyPaths(developmentId);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
