import { apiFetch } from "@/lib/api/fetch";
import { invalidateTenantsClientCache } from "@/lib/api/tenants-list-cache";
const JSON_HEADERS = { "Content-Type": "application/json" };

export class TenantApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TenantApiError";
  }
}

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (body.field && body.code && body.message) {
    throw new TenantApiError(body.message, body.field, body.code);
  }
  throw new Error(body.error || fallback);
}

// ─────────────────────────────
// GET ALL
// ─────────────────────────────
export async function getTenants() {
  const res = await apiFetch("/api/tenants");

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener tenants");
  }

  return res.json();
}

// ─────────────────────────────
// GET ONE
// ─────────────────────────────
export async function getTenant(id: string) {
  const res = await apiFetch(`/api/tenants/${id}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener tenant");
  }

  return res.json();
}

export function getTenantLogoUrl(id: string, cacheKey?: number | string): string {
  const base = `/api/tenants/${id}/logo`;
  return cacheKey != null ? `${base}?v=${cacheKey}` : base;
}

// ─────────────────────────────
// CREATE
// ─────────────────────────────
export async function createTenant(payload: Record<string, unknown>) {
  const res = await apiFetch("/api/tenants", {
    method: "POST",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al crear tenant");
  }

  invalidateTenantsClientCache();
  return res.json();
}

// ─────────────────────────────
// UPDATE
// ─────────────────────────────
export async function updateTenant(
  id: string,
  payload: Record<string, unknown>,
) {
  const res = await apiFetch(`/api/tenants/${id}`, {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al actualizar tenant");
  }

  invalidateTenantsClientCache();
}

export async function uploadTenantLogo(id: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("logo", file);

  const res = await apiFetch(`/api/tenants/${id}/logo`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al subir logo");
  }
}

// ─────────────────────────────
// DELETE
// ─────────────────────────────
export async function deleteTenant(id: string) {
  const res = await apiFetch(`/api/tenants/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al eliminar tenant");
  }

  invalidateTenantsClientCache();
}
