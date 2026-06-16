import { apiFetch } from "@/lib/api/fetch";
import type { DomicilioInput } from "@/lib/validation/schemas/persona-domicilio.schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersonaDomicilio = {
  id: string;
  categoria: string;
  calle: string;
  numero: string | null;
  piso: string | null;
  departamento: string | null;
  barrio: string | null;
  localidad_id: string | null;
  localidad_nombre: string | null;
  localidad_provincia_id: string | null;
  codigo_postal: string | null;
  descripcion: string | null;
  predeterminado: boolean;
  activo: boolean;
  created_at: string;
};

// ── GET ALL ───────────────────────────────────────────────────────────────────

export async function getPersonaDomicilios(personaId: string): Promise<PersonaDomicilio[]> {
  const res = await apiFetch(`/api/personas/${personaId}/domicilios`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener domicilios");
  }
  return res.json();
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createPersonaDomicilio(
  personaId: string,
  payload: DomicilioInput,
): Promise<PersonaDomicilio> {
  const res = await apiFetch(`/api/personas/${personaId}/domicilios`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al crear domicilio");
  }
  return res.json();
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function updatePersonaDomicilio(
  personaId: string,
  domicilioId: string,
  payload: DomicilioInput,
): Promise<PersonaDomicilio> {
  const res = await apiFetch(`/api/personas/${personaId}/domicilios/${domicilioId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al actualizar domicilio");
  }
  return res.json();
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deletePersonaDomicilio(
  personaId: string,
  domicilioId: string,
): Promise<void> {
  const res = await apiFetch(`/api/personas/${personaId}/domicilios/${domicilioId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al eliminar domicilio");
  }
}

// ── SET PREDETERMINADO ────────────────────────────────────────────────────────

export async function setDomicilioPredeterminado(
  personaId: string,
  domicilioId: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/personas/${personaId}/domicilios/${domicilioId}/predeterminado`,
    { method: "PATCH" },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al actualizar predeterminado");
  }
}
