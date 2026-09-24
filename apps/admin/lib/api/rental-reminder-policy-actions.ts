"use server";

import { revalidatePath } from "next/cache";
import { mapRentalError } from "@/lib/api/error-map";
import { updateRentalReminderPolicy } from "@/lib/api/rental-reminder-policy";
import type {
  RentalReminderPolicy,
  UpdateRentalReminderPolicy,
} from "@repo/shared-types";

export type RentalReminderPolicyActionResult =
  | { ok: true; value: RentalReminderPolicy }
  | { ok: false; message: string };

export async function updateRentalReminderPolicyAction(
  payload: UpdateRentalReminderPolicy,
): Promise<RentalReminderPolicyActionResult> {
  try {
    const value = await updateRentalReminderPolicy(payload);
    revalidatePath("/alquileres/comunicaciones");
    revalidatePath("/alquileres/comunicaciones/configuracion");
    return { ok: true, value };
  } catch (error) {
    return { ok: false, message: mapRentalError(error) };
  }
}
