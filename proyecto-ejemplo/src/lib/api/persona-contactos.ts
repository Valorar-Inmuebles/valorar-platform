import { apiFetch } from "@/lib/api/fetch";
import type { ContactoInput } from "@/lib/validation/schemas/persona-contacto.schema";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PersonaContacto = {
  id: string;
  canal: string;
  categoria: string;
  valor: string;
  descripcion: string | null;
  predeterminado: boolean;
  verificado: boolean;
  pais_codigo: string;
  created_at: string;
};

// ── GET ALL ───────────────────────────────────────────────────────────────────

export async function getPersonaContactos(personaId: string): Promise<PersonaContacto[]> {
  const res = await apiFetch(`/api/personas/${personaId}/contactos`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al obtener contactos");
  }
  return res.json();
}

// ── CREATE ────────────────────────────────────────────────────────────────────

export async function createPersonaContacto(
  personaId: string,
  payload: ContactoInput,
): Promise<PersonaContacto> {
  const res = await apiFetch(`/api/personas/${personaId}/contactos`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al crear contacto");
  }
  return res.json();
}

// ── UPDATE ────────────────────────────────────────────────────────────────────

export async function updatePersonaContacto(
  personaId: string,
  contactoId: string,
  payload: ContactoInput,
): Promise<PersonaContacto> {
  const res = await apiFetch(`/api/personas/${personaId}/contactos/${contactoId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al actualizar contacto");
  }
  return res.json();
}

// ── DELETE ────────────────────────────────────────────────────────────────────

export async function deletePersonaContacto(
  personaId: string,
  contactoId: string,
): Promise<void> {
  const res = await apiFetch(`/api/personas/${personaId}/contactos/${contactoId}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al eliminar contacto");
  }
}

// ── SET PREDETERMINADO ────────────────────────────────────────────────────────

export async function setContactoPredeterminado(
  personaId: string,
  contactoId: string,
  canal: string,
): Promise<void> {
  const res = await apiFetch(
    `/api/personas/${personaId}/contactos/${contactoId}/predeterminado`,
    {
      method: "PATCH",
      body: JSON.stringify({ canal }),
    },
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Error al actualizar predeterminado");
  }
}
