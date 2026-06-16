import { getPasswordResetUrl } from "@/lib/auth/app-url";

type PasswordResetEmailPayload = {
  to: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(
  payload: PasswordResetEmailPayload,
): Promise<void> {
  if (process.env.NODE_ENV !== "production") {
    console.info(
      `[email:dev] Recuperación de contraseña para ${payload.to}: ${payload.resetUrl}`,
    );
    return;
  }

  throw new Error(
    "Envío de email no configurado. Configurá un proveedor de email para producción.",
  );
}

export async function sendPasswordResetLink(to: string, token: string) {
  await sendPasswordResetEmail({
    to,
    resetUrl: getPasswordResetUrl(token),
  });
}
