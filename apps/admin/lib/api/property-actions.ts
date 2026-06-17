"use server";

import { revalidatePath } from "next/cache";
import { mapUnknownError } from "@/lib/api/error-map";
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
  return { ok: false, error: mapUnknownError(error) };
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
