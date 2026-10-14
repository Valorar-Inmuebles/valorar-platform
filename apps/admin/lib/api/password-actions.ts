"use server";

import { ApiError } from "@/lib/api/client";
import { changePassword } from "@/lib/api/users";
import type { ChangePasswordPayload } from "@/lib/api/types/user";
import {
  mapPasswordChangeError,
  type PasswordChangeResult,
} from "@/lib/profile/password-change";

export async function changePasswordAction(
  payload: ChangePasswordPayload,
): Promise<PasswordChangeResult> {
  if (
    typeof payload?.currentPassword !== "string" ||
    typeof payload?.newPassword !== "string"
  ) {
    return {
      ok: false,
      code: "INVALID_REQUEST",
      message: "Revisá los campos de la solicitud.",
    };
  }
  try {
    await changePassword({
      currentPassword: payload.currentPassword,
      newPassword: payload.newPassword,
    });
    return { ok: true };
  } catch (error) {
    // Only allowlisted messages/codes cross the Server Action boundary. No logging.
    return error instanceof ApiError
      ? mapPasswordChangeError(error.status, error.body)
      : mapPasswordChangeError(503, null);
  }
}
