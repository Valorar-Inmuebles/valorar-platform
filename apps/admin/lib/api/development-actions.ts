"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
import {
  archiveDevelopment,
  createDevelopment,
  updateDevelopment,
} from "@/lib/api/development";
import type { UpdateDevelopmentPayload } from "@/lib/api/types/development";
import type { CreateDevelopmentPayload } from "@/lib/api/types/development";

export type DevelopmentActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): DevelopmentActionResult {
  return { ok: false, error: mapUnknownError(error) };
}

function revalidateDevelopmentPaths(developmentId?: string) {
  revalidatePath("/emprendimientos");
  if (developmentId) {
    revalidatePath(`/emprendimientos/${developmentId}`);
    revalidatePath(`/emprendimientos/${developmentId}/comercializacion`);
    revalidatePath(`/emprendimientos/${developmentId}/caracteristicas`);
    revalidatePath(`/emprendimientos/${developmentId}/imagenes`);
    revalidatePath(`/emprendimientos/${developmentId}/tipologias`);
  }
}

export async function createDevelopmentAction(
  payload: CreateDevelopmentPayload,
): Promise<DevelopmentActionResult> {
  try {
    const development = await createDevelopment(payload);
    revalidateDevelopmentPaths(development.id);
    return { ok: true, id: development.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updateDevelopmentAction(
  id: string,
  payload: UpdateDevelopmentPayload,
): Promise<DevelopmentActionResult> {
  try {
    await updateDevelopment(id, payload);
    revalidateDevelopmentPaths(id);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archiveDevelopmentAction(
  id: string,
): Promise<DevelopmentActionResult> {
  try {
    await archiveDevelopment(id);
    revalidateDevelopmentPaths(id);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function restoreDevelopmentAction(
  id: string,
): Promise<DevelopmentActionResult> {
  try {
    await updateDevelopment(id, { isActive: true });
    revalidateDevelopmentPaths(id);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
