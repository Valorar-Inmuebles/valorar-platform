import { apiFetch } from "@/lib/api/fetch";
import type { CurrentUserDto } from "@/lib/types/me";
import { invalidateCurrentUserCache } from "@/lib/api/current-user-cache";

export async function getCurrentUser(): Promise<CurrentUserDto> {
  const res = await apiFetch("/api/me");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "No se pudo obtener el usuario");
  }
  return res.json();
}

export async function setViewTenant(
  tenantId: string | null,
): Promise<{ view_tenant_id: string | null; view_tenant_nombre: string | null }> {
  const res = await apiFetch("/api/me/view-tenant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_id: tenantId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "No se pudo cambiar el tenant");
  }

  invalidateCurrentUserCache();
  return res.json();
}
