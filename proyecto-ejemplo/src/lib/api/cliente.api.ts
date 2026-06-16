import { apiFetch } from "@/lib/api/fetch";
import { PersonaApiError } from "./personas";

async function parseErrorResponse(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => ({}));
  if (body.field && body.code && body.message) {
    throw new PersonaApiError(body.message, body.field, body.code);
  }
  throw new Error(body.error || fallback);
}

// ─────────────────────────────
// Search clientes (async selector)
// ─────────────────────────────
export type ClienteOption = {
  id: string;
  label: string;
};

export async function searchClientes(search: string): Promise<ClienteOption[]> {
  const params = new URLSearchParams();
  params.set("search", search);
  const res = await apiFetch(`/api/clientes?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Error al buscar clientes");
  }

  return res.json();
}

// ─────────────────────────────
// GET cliente
// ─────────────────────────────
export async function getCliente(id: string) {
  const res = await apiFetch(`/api/clientes/${id}`);

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al obtener cliente");
  }

  return res.json();
}

export type CreateClienteResponse = {
  success: boolean;
  id: string;
  persona_id: string;
};

// ─────────────────────────────
// CREATE cliente
// ─────────────────────────────
export async function createCliente(payload: {
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
  const res = await apiFetch("/api/clientes", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al crear cliente");
  }

  return res.json() as Promise<CreateClienteResponse>;
}

// ─────────────────────────────
// UPDATE cliente
// ─────────────────────────────
export async function updateCliente(
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
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    await parseErrorResponse(res, "Error al actualizar cliente");
  }
}

// ─────────────────────────────
// Import clientes from file
// ─────────────────────────────
export type ImportClientesResult = {
  lineCount: number;
  importCount: number;
};

export async function importClientesFromFile(
  file: File,
): Promise<ImportClientesResult> {
  const formData = new FormData();
  formData.set("file", file);

  const res = await apiFetch("/api/clientes/importar", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.error || "Error al importar clientes");
  }

  return res.json();
}

// ─────────────────────────────
// DELETE cliente
// ─────────────────────────────
export async function deleteCliente(id: string) {
  const res = await apiFetch(`/api/clientes/${id}`, {
    method: "DELETE",
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Error al eliminar cliente");
  }
}
