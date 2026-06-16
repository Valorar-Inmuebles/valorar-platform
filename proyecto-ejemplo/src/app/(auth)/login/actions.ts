"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { authService } from "@/lib/server/services/auth.service";

const MIN_PASSWORD_LENGTH = 8;

type PasswordResetRequestState = {
  error?: string;
  success?: boolean;
};

type UpdatePasswordState = {
  error?: string;
};

function getSessionMeta() {
  return headers().then((requestHeaders) => ({
    ip:
      requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      requestHeaders.get("x-real-ip"),
    userAgent: requestHeaders.get("user-agent"),
  }));
}

export async function loginAction(
  prevState: { error?: string } | null,
  formData: FormData,
) {
  const email = String(formData.get("email") || "");
  const password = String(formData.get("password") || "");
  const meta = await getSessionMeta();

  const result = await authService.login(email, password, meta);

  if (result.error) {
    return { error: result.error };
  }

  redirect("/");
}

export async function logoutAction(): Promise<{ error: string } | void> {
  await authService.logout();
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: PasswordResetRequestState | null,
  formData: FormData,
): Promise<PasswordResetRequestState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    return { error: "Ingresá tu email." };
  }

  try {
    await authService.requestPasswordReset(email);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo enviar el email.";
    return { error: message };
  }

  return { success: true };
}

export async function updatePasswordAction(
  _prevState: UpdatePasswordState | null,
  formData: FormData,
): Promise<UpdatePasswordState | void> {
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const token = String(formData.get("token") ?? "").trim();

  if (!token) {
    return {
      error: "El enlace de recuperación es inválido. Solicitá uno nuevo.",
    };
  }

  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (password !== confirmPassword) {
    return { error: "Las contraseñas no coinciden." };
  }

  const result = await authService.resetPassword(token, password);

  if (result.error) {
    return { error: result.error };
  }

  redirect("/login?recuperado=1");
}
