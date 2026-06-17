"use server";

import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import {
  archiveProperty,
  createProperty,
  updateProperty,
} from "@/lib/api/property";
import type {
  CreatePropertyPayload,
  UpdatePropertyPayload,
} from "@/lib/api/types/property";

export type PropertyActionResult =
  | { ok: true; id?: string }
  | { ok: false; error: string };

function toActionError(error: unknown): PropertyActionResult {
  if (error instanceof ApiError) return { ok: false, error: error.message };
  if (error instanceof Error) return { ok: false, error: error.message };
  return { ok: false, error: "Ocurrió un error inesperado." };
}

export async function createPropertyAction(
  payload: CreatePropertyPayload,
): Promise<PropertyActionResult> {
  try {
    const property = await createProperty(payload);
    revalidatePath("/propiedades");
    return { ok: true, id: property.id };
  } catch (error) {
    return toActionError(error);
  }
}

export async function updatePropertyAction(
  id: string,
  payload: UpdatePropertyPayload,
): Promise<PropertyActionResult> {
  try {
    await updateProperty(id, payload);
    revalidatePath("/propiedades");
    revalidatePath(`/propiedades/${id}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function archivePropertyAction(
  id: string,
): Promise<PropertyActionResult> {
  try {
    await archiveProperty(id);
    revalidatePath("/propiedades");
    revalidatePath(`/propiedades/${id}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}

export async function restorePropertyAction(
  id: string,
): Promise<PropertyActionResult> {
  try {
    await updateProperty(id, { isActive: true });
    revalidatePath("/propiedades");
    revalidatePath(`/propiedades/${id}`);
    return { ok: true };
  } catch (error) {
    return toActionError(error);
  }
}
