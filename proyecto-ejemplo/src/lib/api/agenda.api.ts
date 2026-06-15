import type {
  AgendaEntidadPadreFilterTipo,
  AgendaEntidadPadreOption,
  AgendaEntidadTipo,
  AgendaEventoDto,
  AgendaEventoEstado,
  AgendaEventoTipoDto,
  AgendaHistorialDto,
  AgendaUsuarioOptionDto,
} from "@/lib/types/agenda";
import type {
  AgendaEventoCreateInput,
  AgendaEventoUpdateInput,
} from "@/lib/validation/schemas/agenda.schema";

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error ?? "Error en la solicitud";
}

export async function getAgendaEventos(
  entidadTipo: AgendaEntidadTipo,
  entidadId: string,
): Promise<AgendaEventoDto[]> {
  const params = new URLSearchParams({
    entidad_tipo: entidadTipo,
    entidad_id: entidadId,
  });
  const res = await fetch(`/api/agenda/eventos?${params}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export type AgendaEventosTenantFilters = {
  desde?: string;
  hasta?: string;
  tipo_id?: string;
  entidad_tipo?: AgendaEntidadTipo;
  entidad_id?: string;
  participante_id?: string;
  creado_por?: string;
  estado?: AgendaEventoEstado;
};

export async function getAgendaEventosTenant(
  filters: AgendaEventosTenantFilters = {},
): Promise<AgendaEventoDto[]> {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value) params.set(key, value);
  }
  const query = params.toString();
  const res = await fetch(
    `/api/agenda/eventos${query ? `?${query}` : ""}`,
  );
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAgendaEvento(id: string): Promise<AgendaEventoDto> {
  const res = await fetch(`/api/agenda/eventos/${id}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function createAgendaEvento(
  payload: AgendaEventoCreateInput,
): Promise<AgendaEventoDto> {
  const res = await fetch("/api/agenda/eventos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function updateAgendaEvento(
  id: string,
  payload: AgendaEventoUpdateInput,
): Promise<AgendaEventoDto> {
  const res = await fetch(`/api/agenda/eventos/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function deleteAgendaEvento(id: string): Promise<void> {
  const res = await fetch(`/api/agenda/eventos/${id}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function getAgendaEntidadesPadre(
  entidadTipo: AgendaEntidadPadreFilterTipo,
  q?: string,
): Promise<AgendaEntidadPadreOption[]> {
  const params = new URLSearchParams({ entidad_tipo: entidadTipo });
  if (q?.trim()) params.set("q", q.trim());
  const res = await fetch(`/api/agenda/entidades-padre?${params}`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAgendaUsuarios(): Promise<AgendaUsuarioOptionDto[]> {
  const res = await fetch("/api/agenda/usuarios");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAgendaTipos(): Promise<AgendaEventoTipoDto[]> {
  const res = await fetch("/api/agenda/tipos");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getAgendaEventoHistorial(
  eventoId: string,
): Promise<AgendaHistorialDto[]> {
  const res = await fetch(`/api/agenda/eventos/${eventoId}/historial`);
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}
