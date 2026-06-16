import { apiFetch } from "@/lib/api/fetch";
import type {
  CampoDinamicoDetail,
  CampoDinamicoListItem,
} from "@/lib/server/services/campos-dinamicos.service";
import type {
  CreateCampoDinamicoInput,
  UpdateCampoDinamicoInput,
} from "@/lib/validation/schemas/campo-dinamico.schema";

export type { CampoDinamicoListItem, CampoDinamicoDetail };

export class CampoDinamicoApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CampoDinamicoApiError";
  }
}

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (
    typeof body === "object" &&
    body !== null &&
    "field" in body &&
    "code" in body &&
    "message" in body &&
    typeof (body as { field: unknown }).field === "string" &&
    typeof (body as { code: unknown }).code === "string" &&
    typeof (body as { message: unknown }).message === "string"
  ) {
    const b = body as { field: string; code: string; message: string };
    throw new CampoDinamicoApiError(b.message, b.field, b.code);
  }
  throw new Error(
    (body as { error?: string }).error ?? fallback,
  );
}

export async function searchCamposDinamicos(
  contexto: string,
  query?: string,
): Promise<CampoDinamicoListItem[]> {
  const params = new URLSearchParams({ contexto });
  if (query?.trim()) {
    params.set("q", query.trim());
  }

  const res = await apiFetch(`/api/campos-dinamicos?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al buscar campos dinámicos",
    );
  }

  return res.json();
}

export async function getCampoDinamico(id: string): Promise<CampoDinamicoDetail> {
  const res = await apiFetch(`/api/campos-dinamicos/${id}`);

  if (!res.ok) {
    await parseErrorResponse(res, "Error al obtener el campo dinámico");
  }

  return res.json();
}

export async function createCampoDinamico(
  payload: CreateCampoDinamicoInput,
): Promise<{ id: string }> {
  const res = await apiFetch("/api/campos-dinamicos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear el campo dinámico");
  }

  return res.json();
}

export async function updateCampoDinamico(
  id: string,
  payload: UpdateCampoDinamicoInput,
): Promise<void> {
  const res = await apiFetch(`/api/campos-dinamicos/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar el campo dinámico");
  }
}

export async function setCampoDinamicoActivo(
  id: string,
  activo: boolean,
): Promise<void> {
  const res = await apiFetch(`/api/campos-dinamicos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar el estado del campo");
  }
}

export async function deactivateCampoDinamico(id: string): Promise<void> {
  const res = await apiFetch(`/api/campos-dinamicos/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al desactivar el campo dinámico");
  }
}
