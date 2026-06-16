import { apiFetch } from "@/lib/api/fetch";
// ─────────────────────────────
// TYPED FIELD ERROR
// ─────────────────────────────

/**
 * Thrown by API helpers when the backend returns a structured field error
 * (HTTP 409 with { code, field, message }).
 * The form can catch this and call setError(field, { message }).
 */
export class PersonaApiError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string
  ) {
    super(message);
    this.name = "PersonaApiError";
  }
}

/** Parses a non-ok API response and throws the appropriate error type. */
async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (body.field && body.code && body.message) {
    throw new PersonaApiError(body.message, body.field, body.code);
  }
  throw new Error(body.error || fallback);
}

// ─────────────────────────────
// GET ALL
// ─────────────────────────────
export async function getPersonas() {
  const res = await apiFetch("/api/personas");

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener personas");
  }

  return res.json();
}

// ─────────────────────────────
// GET ONE
// ─────────────────────────────
export async function getPersona(id: string) {
  const res = await apiFetch(`/api/personas/${id}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener persona");
  }

  return res.json();
}

// ─────────────────────────────
// CREATE
// ─────────────────────────────
export async function createPersona(payload: {
  tipo: string;
  nombre: string;
  apellido?: string | null;
  documento?: string | null;
  cuil?: string | null;
  cuit?: string | null;
  sexo?: string | null;
  fecha_nacimiento?: string | null;
  contactos?: Array<{
    canal: string;
    categoria: string;
    valor: string;
    descripcion?: string | null;
    predeterminado: boolean;
    verificado: boolean;
    pais_codigo: string;
  }>;
  domicilios?: Array<{
    categoria: string;
    calle: string;
    numero?: string | null;
    piso?: string | null;
    departamento?: string | null;
    barrio?: string | null;
    localidad_id?: string | null;
    codigo_postal?: string | null;
    descripcion?: string | null;
    predeterminado: boolean;
    activo: boolean;
  }>;
}) {
  const res = await apiFetch("/api/personas", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear persona");
  }

  return res.json();
}

// ─────────────────────────────
// UPDATE
// ─────────────────────────────
export async function updatePersona(
  id: string,
  payload: {
    tipo: string;
    nombre: string;
    apellido?: string | null;
    documento?: string | null;
    cuil?: string | null;
    cuit?: string | null;
    sexo?: string | null;
    fecha_nacimiento?: string | null;
  }
) {
  const res = await apiFetch(`/api/personas/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar persona");
  }
}

// ─────────────────────────────
// DELETE
// ─────────────────────────────
export async function deletePersona(id: string) {
  const res = await apiFetch(`/api/personas/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al eliminar persona");
  }
}
