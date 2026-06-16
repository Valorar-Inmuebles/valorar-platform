import { apiFetch } from "@/lib/api/fetch";
export class CasoApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CasoApiError";
  }
}

export class CasoTramiteApiError extends Error {
  constructor(public readonly errors: Record<string, string>) {
    super("Errores de validación en campos del trámite");
    this.name = "CasoTramiteApiError";
  }
}

export type ValorDinamicoPayload = {
  campo_id: string;
  valor: unknown;
};

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (body.code === "TRAMITE_VALIDATION" && body.errors) {
    throw new CasoTramiteApiError(body.errors as Record<string, string>);
  }
  if (body.field && body.code && body.message) {
    throw new CasoApiError(body.message, body.field, body.code);
  }
  throw new Error(body.error || fallback);
}

export type CasoListItem = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  estado: string | null;
  nombre: string | null;
  practica_id: string;
  created_at: string | null;
  numero: string | null;
  cliente: { nombre: string };
  practica: { nombre: string };
};

/** Flat row for GET `/api/casos/[id]` (no list embeds). */
export type CasoDetail = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  descripcion: string | null;
  estado: string | null;
  nombre: string | null;
  numero: string | null;
  plantilla_id: string | null;
  practica_id: string;
  created_at: string | null;
  has_expedientes: boolean;
};

export async function getCasos(): Promise<CasoListItem[]> {
  const res = await apiFetch("/api/casos");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener casos");
  }
  return res.json();
}

export async function getCaso(id: string): Promise<CasoDetail> {
  const res = await apiFetch(`/api/casos/${id}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener caso");
  }
  return res.json();
}

export async function createCaso(payload: {
  cliente_id: string;
  nombre: string;
  descripcion?: string | null;
  practica_id: string;
  valores_dinamicos?: ValorDinamicoPayload[];
  tramite_plantilla_id?: string | null;
}) {
  const res = await apiFetch("/api/casos", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear caso");
  }

  return res.json();
}

export async function updateCaso(
  id: string,
  payload: {
    cliente_id?: string;
    nombre?: string | null;
    descripcion?: string | null;
    practica_id?: string | null;
    valores_dinamicos?: ValorDinamicoPayload[];
    tramite_plantilla_id?: string | null;
  },
) {
  const res = await apiFetch(`/api/casos/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar caso");
  }
}

export async function deleteCaso(id: string) {
  const res = await apiFetch(`/api/casos/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al eliminar caso");
  }
}
