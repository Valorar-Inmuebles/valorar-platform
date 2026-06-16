import { getSession } from "@/lib/auth/session";

/**
 * @deprecated Usar getSession() desde lib/auth/session.
 * Fallback de entorno solo para scripts locales fuera del flujo web.
 */
export async function getAdminTenantId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.tenantId ?? null;
}

/** @deprecated Usar getSession().user.id */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}

/** @deprecated El tenant se resuelve en la API desde la sesión JWT. */
export async function requireAdminTenantId(): Promise<string> {
  const tenantId = await getAdminTenantId();
  if (!tenantId) {
    throw new Error(
      "No hay tenant activo en sesión. Iniciá sesión o seleccioná un tenant (SUPER_ADMIN).",
    );
  }
  return tenantId;
}

/** @deprecated El usuario se resuelve en la API desde la sesión JWT. */
export async function requireAdminUserId(): Promise<string> {
  const userId = await getAdminUserId();
  if (!userId) {
    throw new Error("No hay usuario autenticado. Iniciá sesión.");
  }
  return userId;
}
