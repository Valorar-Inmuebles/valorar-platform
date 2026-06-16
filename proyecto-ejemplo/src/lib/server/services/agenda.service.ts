import { agendaEntidadPath } from "@/lib/agenda/agenda-entidad-path";
import { mapNotificarAntesFromRow } from "@/lib/agenda/agenda-notificar-antes";
import {
  buildAgendaTimestamps,
  splitAgendaTimestamps,
} from "@/lib/agenda/agenda-datetime";
import { computeEstadoVisual } from "@/lib/agenda/compute-estado-visual";
import type {
  AgendaEntidadPadreFilterTipo,
  AgendaEntidadPadreOption,
  AgendaEntidadTipo,
  AgendaEventoDto,
  AgendaNotificarAntesUnidad,
  AgendaEventoEstado,
  AgendaEventoParticipanteDto,
  AgendaEventoTipoDto,
  AgendaHistorialAccion,
  AgendaHistorialDto,
  AgendaUsuarioOptionDto,
} from "@/lib/types/agenda";
import type {
  AgendaEventoCreateInput,
  AgendaEventoUpdateInput,
} from "@/lib/validation/schemas/agenda.schema";
import { agendaEventoHistorialRepository } from "@/BBDD/repositories/agenda-evento-historial.repository";
import { agendaEventoTipoRepository } from "@/BBDD/repositories/agenda-evento-tipo.repository";
import {
  agendaEventoParticipanteRepository,
  type AgendaParticipanteRow,
} from "@/BBDD/repositories/agenda-evento-participante.repository";
import {
  agendaEventoRepository,
  type AgendaEventoListFilters,
} from "@/BBDD/repositories/agenda-evento.repository";
import { usuarioRepository } from "@/BBDD/repositories/usuario.repository";
import { comentarioAuditoriaRepository } from "@/BBDD/repositories/comentario-auditoria.repository";
import { NotFoundError } from "@/lib/server/not-found-error";
import {
  personaDisplayName,
  unwrapOne,
} from "@/lib/server/utils/persona-display-name";
import type { ServerContext } from "@/lib/server/context/types";

type Ctx = ServerContext;

type PersonaRow = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

type UsuarioJoinRow = {
  id: string;
  persona?: PersonaRow | PersonaRow[] | null;
};

type TipoJoinRow = {
  id: string;
  codigo: string;
  nombre: string;
  color_fondo: string;
  color_texto: string;
  duracion_default_minutos: number;
};

type EventoRow = {
  id: string;
  entidad_tipo: AgendaEntidadTipo | null;
  entidad_id: string | null;
  titulo: string;
  descripcion: string | null;
  ubicacion: string | null;
  observaciones: string | null;
  inicio_at: string;
  fin_at: string | null;
  todo_el_dia: boolean;
  estado: AgendaEventoEstado;
  creado_por: string;
  notificar_antes_cantidad: number | null;
  notificar_antes_unidad: AgendaNotificarAntesUnidad | null;
  created_at: string;
  updated_at: string;
  tipo?: TipoJoinRow | TipoJoinRow[] | null;
  creado_por_usuario?: UsuarioJoinRow | UsuarioJoinRow[] | null;
};

type HistorialRow = {
  id: string;
  accion: AgendaHistorialAccion;
  detalle: Record<string, unknown> | null;
  created_at: string;
  usuario?: UsuarioJoinRow | UsuarioJoinRow[] | null;
};

function isAgendaAdmin(ctx: Ctx): boolean {
  return Boolean(ctx.is_superadmin || ctx.roles?.includes("admin"));
}

function mapTipo(tipo: TipoJoinRow | null): AgendaEventoTipoDto {
  return {
    id: tipo?.id ?? "",
    codigo: tipo?.codigo ?? "otro",
    nombre: tipo?.nombre ?? "Otro",
    colorFondo: tipo?.color_fondo ?? "#F4F4F5",
    colorTexto: tipo?.color_texto ?? "#52525B",
    duracionDefaultMinutos: tipo?.duracion_default_minutos ?? 60,
  };
}

function mapUsuarioNombre(usuario: UsuarioJoinRow | null): string {
  return personaDisplayName(unwrapOne(usuario?.persona ?? null));
}

function mapParticipanteRow(row: AgendaParticipanteRow): AgendaEventoParticipanteDto {
  return {
    usuarioId: row.usuario_id,
    nombre: personaDisplayName(row.persona),
    notificadoAt: row.notificado_at,
  };
}

function mapRowToDto(
  row: EventoRow,
  ctx: Ctx,
  etiquetaPadre: string | null | undefined,
  participantes: AgendaEventoParticipanteDto[],
): AgendaEventoDto {
  const tipo = mapTipo(unwrapOne(row.tipo ?? null));
  const creador = unwrapOne(row.creado_por_usuario ?? null);
  const isAuthor = row.creado_por === ctx.user.id;
  const admin = isAgendaAdmin(ctx);
  const canMutate = isAuthor || admin;

  return {
    id: row.id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    ubicacion: row.ubicacion,
    observaciones: row.observaciones,
    inicioAt: row.inicio_at,
    finAt: row.fin_at,
    todoElDia: row.todo_el_dia,
    estado: row.estado,
    estadoVisual: computeEstadoVisual({
      estado: row.estado,
      inicioAt: row.inicio_at,
      finAt: row.fin_at,
    }),
    tipo,
    padre:
      row.entidad_tipo && row.entidad_id
        ? {
            entidadTipo: row.entidad_tipo,
            entidadId: row.entidad_id,
            ruta: agendaEntidadPath(row.entidad_tipo, row.entidad_id),
            etiqueta: etiquetaPadre ?? null,
          }
        : null,
    creadoPor: {
      id: creador?.id ?? row.creado_por,
      nombre: mapUsuarioNombre(creador),
    },
    participantes,
    notificarAntes: mapNotificarAntesFromRow(
      row.notificar_antes_cantidad,
      row.notificar_antes_unidad,
    ),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    puedeEditar: canMutate,
    puedeEliminar: canMutate,
    puedeCambiarEstado: canMutate,
  };
}

async function mapRowsToDto(
  rows: EventoRow[],
  ctx: Ctx,
): Promise<AgendaEventoDto[]> {
  if (rows.length === 0) return [];

  const [etiquetas, participanteRows] = await Promise.all([
    agendaEventoRepository.resolveEntidadEtiquetasBatch(
      ctx,
      rows.flatMap((row) =>
        row.entidad_tipo && row.entidad_id
          ? [
              {
                entidad_tipo: row.entidad_tipo,
                entidad_id: row.entidad_id,
              },
            ]
          : [],
      ),
    ),
    agendaEventoParticipanteRepository.listByEventoIds(
      ctx,
      rows.map((row) => row.id),
    ),
  ]);

  const participantesByEvento = new Map<string, AgendaEventoParticipanteDto[]>();
  for (const participante of participanteRows) {
    const current = participantesByEvento.get(participante.evento_id) ?? [];
    current.push(mapParticipanteRow(participante));
    participantesByEvento.set(participante.evento_id, current);
  }

  return rows.map((row) =>
    mapRowToDto(
      row,
      ctx,
      row.entidad_tipo && row.entidad_id
        ? etiquetas.get(
            agendaEventoRepository.entidadEtiquetaKey(
              row.entidad_tipo,
              row.entidad_id,
            ),
          )
        : undefined,
      participantesByEvento.get(row.id) ?? [],
    ),
  );
}

async function assertParticipantesInTenant(ctx: Ctx, usuarioIds: string[]) {
  if (usuarioIds.length === 0) return;
  if (!ctx.tenant_id) throw new Error("Tenant no definido");

  const uniqueIds = [...new Set(usuarioIds)];
  const count = await usuarioRepository.countActivosByIds(ctx, uniqueIds);
  if (count !== uniqueIds.length) {
    throw new Error("Uno o más participantes no pertenecen al tenant");
  }
}

async function syncParticipantesWithHistorial(
  ctx: Ctx,
  eventoId: string,
  usuarioIds: string[],
) {
  const { added, removed } =
    await agendaEventoParticipanteRepository.syncForEvento(
      ctx,
      eventoId,
      usuarioIds,
    );

  for (const usuarioId of added) {
    await logHistorial(ctx, eventoId, "participante_agregado", { usuario_id: usuarioId });
  }
  for (const usuarioId of removed) {
    await logHistorial(ctx, eventoId, "participante_quitado", { usuario_id: usuarioId });
  }
}

function auditoriaExpedienteIdFrom(
  entidadTipo: AgendaEntidadTipo | null,
  entidadId: string | null,
): string | null {
  return entidadTipo === "expediente" && entidadId ? entidadId : null;
}

async function logHistorial(
  ctx: Ctx,
  eventoId: string,
  accion: AgendaHistorialAccion,
  detalle?: Record<string, unknown> | null,
) {
  await agendaEventoHistorialRepository.insert(ctx, {
    evento_id: eventoId,
    accion,
    detalle: detalle ?? null,
    usuario_id: ctx.user.id,
  });
}

async function logAuditoria(
  ctx: Ctx,
  params: {
    accion: string;
    eventoId: string;
    entidadTipo: AgendaEntidadTipo | null;
    entidadId: string | null;
    detalle?: Record<string, unknown> | null;
  },
) {
  await comentarioAuditoriaRepository.log(ctx, {
    accion: params.accion,
    entidad: "agenda_evento",
    entidad_id: params.eventoId,
    expediente_id: auditoriaExpedienteIdFrom(
      params.entidadTipo,
      params.entidadId,
    ),
    detalle: params.detalle ?? null,
  });
}

function resolveDefaultHoraFin(
  horaInicio: string,
  duracionMinutos: number,
): string {
  const [h, m] = horaInicio.split(":").map(Number);
  const total = h * 60 + m + duracionMinutos;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

export const agendaService = {
  async listTipos(ctx: Ctx): Promise<AgendaEventoTipoDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const rows = await agendaEventoTipoRepository.listActivosForTenant(ctx);
    return rows.map((row) =>
      mapTipo(row as unknown as TipoJoinRow),
    );
  },

  async listByEntidad(
    ctx: Ctx,
    entidadTipo: AgendaEntidadTipo,
    entidadId: string,
  ): Promise<AgendaEventoDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const exists = await agendaEventoRepository.assertEntidadExists(
      ctx,
      entidadTipo,
      entidadId,
    );
    if (!exists) {
      throw new NotFoundError("Entidad no encontrada");
    }

    const rows = (await agendaEventoRepository.listByEntidad(
      ctx,
      entidadTipo,
      entidadId,
    )) as unknown as EventoRow[];

    return mapRowsToDto(rows, ctx);
  },

  async listForTenant(
    ctx: Ctx,
    filters: AgendaEventoListFilters,
  ): Promise<AgendaEventoDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const rows = (await agendaEventoRepository.listForTenant(
      ctx,
      filters,
    )) as unknown as EventoRow[];

    return mapRowsToDto(rows, ctx);
  },

  async listEntidadesPadre(
    ctx: Ctx,
    entidadTipo: AgendaEntidadPadreFilterTipo,
    q?: string,
  ): Promise<AgendaEntidadPadreOption[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    return agendaEventoRepository.listEntidadesPadre(ctx, entidadTipo, q);
  },

  async listUsuarios(ctx: Ctx): Promise<AgendaUsuarioOptionDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const rows = await usuarioRepository.listActivosForPicker(ctx);
    return rows.map((row) => ({
      id: row.id,
      nombre: personaDisplayName(row.persona),
    }));
  },

  async getById(ctx: Ctx, id: string): Promise<AgendaEventoDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const row = (await agendaEventoRepository.getById(
      ctx,
      id,
    )) as unknown as EventoRow | null;
    if (!row) throw new NotFoundError("Evento no encontrado");

    const [dto] = await mapRowsToDto([row], ctx);
    return dto;
  },

  async create(ctx: Ctx, payload: AgendaEventoCreateInput): Promise<AgendaEventoDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    if (payload.entidad_tipo && payload.entidad_id) {
      const exists = await agendaEventoRepository.assertEntidadExists(
        ctx,
        payload.entidad_tipo,
        payload.entidad_id,
      );
      if (!exists) throw new NotFoundError("Entidad no encontrada");
    }

    const tipo = await agendaEventoTipoRepository.getByIdForTenant(
      ctx,
      payload.tipo_id,
    );
    if (!tipo) throw new NotFoundError("Tipo de evento no encontrado");

    let horaFin = payload.hora_fin;
    if (
      !payload.todo_el_dia &&
      payload.hora_inicio &&
      !horaFin &&
      tipo.duracion_default_minutos > 0
    ) {
      horaFin = resolveDefaultHoraFin(
        payload.hora_inicio,
        tipo.duracion_default_minutos,
      );
    }

    const { inicioAt, finAt } = buildAgendaTimestamps({
      fecha: payload.fecha,
      horaInicio: payload.hora_inicio,
      horaFin,
      todoElDia: payload.todo_el_dia,
    });

    const participanteIds = payload.participante_ids ?? [];
    await assertParticipantesInTenant(ctx, participanteIds);

    const created = await agendaEventoRepository.create(ctx, {
      entidad_tipo: payload.entidad_tipo ?? null,
      entidad_id: payload.entidad_id ?? null,
      tipo_id: payload.tipo_id,
      titulo: payload.titulo,
      descripcion: payload.descripcion ?? null,
      ubicacion: payload.ubicacion ?? null,
      observaciones: payload.observaciones ?? null,
      inicio_at: inicioAt,
      fin_at: finAt,
      todo_el_dia: payload.todo_el_dia,
      creado_por: ctx.user.id,
      notificar_antes_cantidad: payload.notificar_antes_cantidad ?? null,
      notificar_antes_unidad: payload.notificar_antes_unidad ?? null,
    });

    if (participanteIds.length > 0) {
      await syncParticipantesWithHistorial(ctx, created.id, participanteIds);
    }

    await logHistorial(ctx, created.id, "crear", {
      titulo: payload.titulo,
      inicio_at: inicioAt,
      fin_at: finAt,
    });

    await logAuditoria(ctx, {
      accion: "agenda_evento.crear",
      eventoId: created.id,
      entidadTipo: payload.entidad_tipo ?? null,
      entidadId: payload.entidad_id ?? null,
      detalle: { titulo: payload.titulo },
    });

    return this.getById(ctx, created.id);
  },

  async update(
    ctx: Ctx,
    id: string,
    payload: AgendaEventoUpdateInput,
  ): Promise<AgendaEventoDto> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const existing = (await agendaEventoRepository.getById(
      ctx,
      id,
    )) as unknown as EventoRow | null;
    if (!existing) throw new NotFoundError("Evento no encontrado");

    const canEdit =
      existing.creado_por === ctx.user.id || isAgendaAdmin(ctx);
    if (!canEdit) throw new Error("No tenés permiso para editar este evento");

    if (payload.tipo_id) {
      const tipo = await agendaEventoTipoRepository.getByIdForTenant(
        ctx,
        payload.tipo_id,
      );
      if (!tipo) throw new NotFoundError("Tipo de evento no encontrado");
    }

    const updateFields: Parameters<typeof agendaEventoRepository.update>[2] = {};

    if (payload.tipo_id !== undefined) updateFields.tipo_id = payload.tipo_id;
    if (payload.titulo !== undefined) updateFields.titulo = payload.titulo;
    if (payload.descripcion !== undefined) {
      updateFields.descripcion = payload.descripcion ?? null;
    }
    if (payload.ubicacion !== undefined) {
      updateFields.ubicacion = payload.ubicacion ?? null;
    }
    if (payload.observaciones !== undefined) {
      updateFields.observaciones = payload.observaciones ?? null;
    }
    if (payload.estado !== undefined) updateFields.estado = payload.estado;
    if (payload.notificar_antes_cantidad !== undefined) {
      updateFields.notificar_antes_cantidad =
        payload.notificar_antes_cantidad ?? null;
    }
    if (payload.notificar_antes_unidad !== undefined) {
      updateFields.notificar_antes_unidad =
        payload.notificar_antes_unidad ?? null;
    }

    const fechaChanged =
      payload.fecha !== undefined ||
      payload.hora_inicio !== undefined ||
      payload.hora_fin !== undefined ||
      payload.todo_el_dia !== undefined;

    if (fechaChanged) {
      const todoElDia = payload.todo_el_dia ?? existing.todo_el_dia;
      const existingParts = splitAgendaTimestamps({
        inicioAt: existing.inicio_at,
        finAt: existing.fin_at,
        todoElDia: existing.todo_el_dia,
      });
      const fecha = payload.fecha ?? existingParts.fecha;

      const { inicioAt, finAt } = buildAgendaTimestamps({
        fecha,
        horaInicio:
          (payload.hora_inicio ?? existingParts.horaInicio) || undefined,
        horaFin:
          payload.hora_fin === null
            ? null
            : (payload.hora_fin ?? existingParts.horaFin) || undefined,
        todoElDia,
      });

      updateFields.inicio_at = inicioAt;
      updateFields.fin_at = finAt;
      updateFields.todo_el_dia = todoElDia;

      if (existing.inicio_at !== inicioAt) {
        await logHistorial(ctx, id, "cambio_fecha", {
          anterior: existing.inicio_at,
          nuevo: inicioAt,
        });
      }
      if (existing.fin_at !== finAt) {
        await logHistorial(ctx, id, "cambio_hora", {
          anterior: existing.fin_at,
          nuevo: finAt,
        });
      }
    }

    if (payload.estado === "cancelado" && existing.estado !== "cancelado") {
      await logHistorial(ctx, id, "cancelar");
    }
    if (payload.estado === "realizado" && existing.estado !== "realizado") {
      await logHistorial(ctx, id, "realizar");
    }

    const hasOtherEdits =
      payload.tipo_id !== undefined ||
      payload.titulo !== undefined ||
      payload.descripcion !== undefined ||
      payload.ubicacion !== undefined ||
      payload.observaciones !== undefined ||
      payload.participante_ids !== undefined ||
      payload.notificar_antes_cantidad !== undefined ||
      payload.notificar_antes_unidad !== undefined;

    if (payload.participante_ids !== undefined) {
      await assertParticipantesInTenant(ctx, payload.participante_ids);
    }

    if (hasOtherEdits) {
      await logHistorial(ctx, id, "edicion", { campos: Object.keys(payload) });
    }

    await agendaEventoRepository.update(ctx, id, updateFields);

    if (payload.participante_ids !== undefined) {
      await syncParticipantesWithHistorial(ctx, id, payload.participante_ids);
    }

    await logAuditoria(ctx, {
      accion: "agenda_evento.editar",
      eventoId: id,
      entidadTipo: existing.entidad_tipo,
      entidadId: existing.entidad_id,
      detalle: payload as Record<string, unknown>,
    });

    return this.getById(ctx, id);
  },

  async remove(ctx: Ctx, id: string): Promise<void> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const existing = (await agendaEventoRepository.getById(
      ctx,
      id,
    )) as unknown as EventoRow | null;
    if (!existing) throw new NotFoundError("Evento no encontrado");

    const canDelete =
      existing.creado_por === ctx.user.id || isAgendaAdmin(ctx);
    if (!canDelete) throw new Error("No tenés permiso para eliminar este evento");

    await agendaEventoRepository.softDelete(ctx, id, ctx.user.id);

    await logAuditoria(ctx, {
      accion: "agenda_evento.eliminar",
      eventoId: id,
      entidadTipo: existing.entidad_tipo,
      entidadId: existing.entidad_id,
      detalle: { deleted_by: ctx.user.id },
    });
  },

  async listHistorial(ctx: Ctx, eventoId: string): Promise<AgendaHistorialDto[]> {
    if (!ctx.tenant_id) throw new Error("Tenant no definido");

    const evento = await agendaEventoRepository.getById(ctx, eventoId);
    if (!evento) throw new NotFoundError("Evento no encontrado");

    const rows = (await agendaEventoHistorialRepository.listByEvento(
      ctx,
      eventoId,
    )) as unknown as HistorialRow[];

    return rows.map((row) => {
      const usuario = unwrapOne(row.usuario ?? null);
      return {
        id: row.id,
        accion: row.accion,
        detalle: row.detalle,
        usuario: {
          id: usuario?.id ?? "",
          nombre: mapUsuarioNombre(usuario),
        },
        createdAt: row.created_at,
      };
    });
  },
};
