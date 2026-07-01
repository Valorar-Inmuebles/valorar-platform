"use server";

import { revalidatePath } from "next/cache";
import {
  createUser,
  updateProfile,
  updateUser,
} from "@/lib/api/users";
import type {
  CreateUserPayload,
  UpdateProfilePayload,
  UpdateUserPayload,
} from "@/lib/api/types/user";
import { mapUnknownError } from "@/lib/api/error-map";

export async function createUserAction(
  payload: CreateUserPayload,
): Promise<{ ok: true; userId: string } | { ok: false; message: string }> {
  try {
    const user = await createUser(payload);
    revalidatePath("/configuracion/usuarios");
    return { ok: true, userId: user.id };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}

export async function updateUserAction(
  id: string,
  payload: UpdateUserPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await updateUser(id, payload);
    revalidatePath("/configuracion/usuarios");
    revalidatePath(`/configuracion/usuarios/${id}`);
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}

export async function updateProfileAction(
  payload: UpdateProfilePayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await updateProfile(payload);
    revalidatePath("/configuracion/perfil");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}
