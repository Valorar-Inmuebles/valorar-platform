import type { AuthUser } from "@/lib/auth/types";

export type ActiveTenantGate =
  | { ok: true }
  | { ok: false; reason: "super-admin-no-tenant" };

export function resolveActiveTenantGate(
  user: AuthUser,
  activeTenantId: string | null,
): ActiveTenantGate {
  if (user.role === "SUPER_ADMIN" && !activeTenantId) {
    return { ok: false, reason: "super-admin-no-tenant" };
  }

  return { ok: true };
}
