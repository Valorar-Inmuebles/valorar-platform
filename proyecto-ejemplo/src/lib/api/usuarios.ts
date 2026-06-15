import { apiFetch } from "@/lib/api/fetch";
export class UsuarioApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "UsuarioApiError";
  }
}

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (body.field && body.code && body.message) {
    throw new UsuarioApiError(body.message, body.field, body.code);
  }
  throw new Error(body.error || fallback);
}

export type UsuarioFormData = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol_ids: string[];
  activo: boolean;
  tenant_id?: string | null;
  has_foto: boolean;
};

export type RolOption = {
  id: string;
  nombre: string;
};

export type TenantOption = {
  id: string;
  nombre: string;
};

export async function getUsuarioRoles(): Promise<RolOption[]> {
  const res = await apiFetch("/api/usuarios/roles");
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Error al obtener roles");
  }
  return res.json();
}

export async function getUsuarioTenants(options?: {
  includeSuper?: boolean;
}): Promise<TenantOption[]> {
  const query = options?.includeSuper ? "?includeSuper=true" : "";
  const res = await apiFetch(`/api/usuarios/tenants${query}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Error al obtener tenants");
  }
  return res.json();
}

export async function getUsuario(id: string): Promise<UsuarioFormData> {
  const res = await apiFetch(`/api/usuarios/${id}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Error al obtener usuario");
  }
  return res.json();
}

export function getUsuarioFotoUrl(id: string, cacheKey?: number | string): string {
  const base = `/api/usuarios/${id}/foto`;
  return cacheKey != null ? `${base}?v=${cacheKey}` : base;
}

export async function uploadUsuarioFoto(id: string, file: File): Promise<void> {
  const formData = new FormData();
  formData.append("foto", file);

  const res = await apiFetch(`/api/usuarios/${id}/foto`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al subir foto");
  }
}

export async function createUsuario(payload: {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  rol_ids: string[];
  activo: boolean;
  tenant_id?: string;
}) {
  const res = await apiFetch("/api/usuarios", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear usuario");
  }

  return res.json();
}

export async function updateUsuario(
  id: string,
  payload: {
    email: string;
    password?: string;
    nombre: string;
    apellido: string;
    rol_ids: string[];
    activo: boolean;
    tenant_id?: string;
  },
) {
  const res = await apiFetch(`/api/usuarios/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar usuario");
  }
}

export async function setUsuarioActivo(
  id: string,
  activo: boolean,
): Promise<void> {
  const res = await apiFetch(`/api/usuarios/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
  });

  if (!res.ok) {
    await parseErrorResponse(
      res,
      activo ? "Error al habilitar usuario" : "Error al deshabilitar usuario",
    );
  }
}

export async function deactivateUsuario(id: string): Promise<void> {
  await setUsuarioActivo(id, false);
}
