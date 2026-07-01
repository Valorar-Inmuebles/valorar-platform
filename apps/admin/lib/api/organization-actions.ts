"use server";

import { revalidatePath } from "next/cache";
import { updateOrganization } from "@/lib/api/organization";
import type { UpdateOrganizationPayload } from "@/lib/api/types/organization";
import { mapUnknownError } from "@/lib/api/error-map";

export async function updateOrganizationAction(
  payload: UpdateOrganizationPayload,
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    await updateOrganization(payload);
    revalidatePath("/configuracion/organizacion");
    return { ok: true };
  } catch (error) {
    return { ok: false, message: mapUnknownError(error) };
  }
}
