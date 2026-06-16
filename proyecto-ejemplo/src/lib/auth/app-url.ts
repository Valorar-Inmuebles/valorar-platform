/** Base URL pública de la app (sin barra final). */
export function getAppUrl(): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

/** URL directa para restablecer contraseña con token opaco. */
export function getPasswordResetUrl(token: string): string {
  return `${getAppUrl()}/login/nueva-contrasena?token=${encodeURIComponent(token)}`;
}
