import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export type AgendaParticipanteRow = {
  evento_id: string;
  usuario_id: string;
  notificado_at: string | null;
  persona: {
    tipo: string | null;
    nombre: string | null;
    apellido: string | null;
  } | null;
};

export type AgendaEventoAvisoPendienteRow = {
  evento_id: string;
  titulo: string;
  inicio_at: string;
  fin_at: string | null;
  todo_el_dia: boolean;
  aviso_at: string;
};

const AVISO_DEBIDO_SQL = `now() >= (
  e.inicio_at - (
    CASE e.notificar_antes_unidad
      WHEN 'minutos' THEN make_interval(mins => e.notificar_antes_cantidad)
      WHEN 'horas' THEN make_interval(hours => e.notificar_antes_cantidad)
      WHEN 'dias' THEN make_interval(days => e.notificar_antes_cantidad)
    END
  )
)`;

const AVISO_AT_SQL = `(
  e.inicio_at - (
    CASE e.notificar_antes_unidad
      WHEN 'minutos' THEN make_interval(mins => e.notificar_antes_cantidad)
      WHEN 'horas' THEN make_interval(hours => e.notificar_antes_cantidad)
      WHEN 'dias' THEN make_interval(days => e.notificar_antes_cantidad)
    END
  )
)`;

const AVISO_PENDIENTE_WHERE = `
  e.tenant_id = $1
  AND ep.usuario_id = $2
  AND ep.notificado_at IS NULL
  AND e.deleted_at IS NULL
  AND e.estado = 'programado'
  AND e.notificar_antes_cantidad IS NOT NULL
  AND e.notificar_antes_unidad IS NOT NULL
  AND ${AVISO_DEBIDO_SQL}`;

export const agendaEventoParticipanteRepository = {
  async listByEventoIds(
    ctx: DbContext,
    eventoIds: string[],
  ): Promise<AgendaParticipanteRow[]> {
    if (eventoIds.length === 0) return [];

    const tenantId = requireTenantId(ctx);
    return queryRows<AgendaParticipanteRow>(
      `SELECT
         ep.evento_id,
         ep.usuario_id,
         ep.notificado_at,
         json_build_object(
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido
         ) AS persona
       FROM agenda_evento_participante ep
       INNER JOIN agenda_evento e ON e.id = ep.evento_id
       INNER JOIN usuario u ON u.id = ep.usuario_id
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE e.tenant_id = $1
         AND ep.evento_id = ANY($2::uuid[])
       ORDER BY ep.created_at ASC`,
      [tenantId, eventoIds],
    );
  },

  async listUsuarioIdsByEvento(ctx: DbContext, eventoId: string): Promise<string[]> {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<{ usuario_id: string }>(
      `SELECT ep.usuario_id
       FROM agenda_evento_participante ep
       INNER JOIN agenda_evento e ON e.id = ep.evento_id
       WHERE e.tenant_id = $1 AND ep.evento_id = $2`,
      [tenantId, eventoId],
    );
    return rows.map((row) => row.usuario_id);
  },

  async syncForEvento(
    ctx: DbContext,
    eventoId: string,
    usuarioIds: string[],
  ): Promise<{ added: string[]; removed: string[] }> {
    const tenantId = requireTenantId(ctx);

    const existing = await queryRows<{ usuario_id: string }>(
      `SELECT ep.usuario_id
       FROM agenda_evento_participante ep
       INNER JOIN agenda_evento e ON e.id = ep.evento_id
       WHERE e.tenant_id = $1 AND ep.evento_id = $2`,
      [tenantId, eventoId],
    );

    const existingSet = new Set(existing.map((row) => row.usuario_id));
    const targetSet = new Set(usuarioIds);

    const toRemove = [...existingSet].filter((id) => !targetSet.has(id));
    const toAdd = usuarioIds.filter((id) => !existingSet.has(id));

    if (toRemove.length > 0) {
      await pgQuery(
        `DELETE FROM agenda_evento_participante
         WHERE evento_id = $1 AND usuario_id = ANY($2::uuid[])`,
        [eventoId, toRemove],
      );
    }

    for (const usuarioId of toAdd) {
      await pgQuery(
        `INSERT INTO agenda_evento_participante (evento_id, usuario_id)
         VALUES ($1, $2)
         ON CONFLICT (evento_id, usuario_id) DO NOTHING`,
        [eventoId, usuarioId],
      );
    }

    return { added: toAdd, removed: toRemove };
  },

  async listPendientesAvisoForUsuario(
    ctx: DbContext,
    usuarioId: string,
  ): Promise<AgendaEventoAvisoPendienteRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<AgendaEventoAvisoPendienteRow>(
      `SELECT
         ep.evento_id,
         e.titulo,
         e.inicio_at,
         e.fin_at,
         e.todo_el_dia,
         ${AVISO_AT_SQL} AS aviso_at
       FROM agenda_evento_participante ep
       INNER JOIN agenda_evento e ON e.id = ep.evento_id
       WHERE ${AVISO_PENDIENTE_WHERE}
       ORDER BY e.inicio_at ASC`,
      [tenantId, usuarioId],
    );
  },

  async countPendientesAvisoForUsuario(
    ctx: DbContext,
    usuarioId: string,
  ): Promise<number> {
    const tenantId = requireTenantId(ctx);
    const row = await queryRows<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM agenda_evento_participante ep
       INNER JOIN agenda_evento e ON e.id = ep.evento_id
       WHERE ${AVISO_PENDIENTE_WHERE}`,
      [tenantId, usuarioId],
    );
    return Number(row[0]?.count ?? 0);
  },

  async markNotificado(
    ctx: DbContext,
    eventoId: string,
    usuarioId: string,
    notificadoAt: string,
  ): Promise<void> {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE agenda_evento_participante ep
       SET notificado_at = $4
       FROM agenda_evento e
       WHERE ep.evento_id = e.id
         AND e.tenant_id = $1
         AND ep.evento_id = $2
         AND ep.usuario_id = $3`,
      [tenantId, eventoId, usuarioId, notificadoAt],
    );
  },

  async markAllPendientesAvisoNotificado(
    ctx: DbContext,
    usuarioId: string,
    notificadoAt: string,
  ): Promise<void> {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE agenda_evento_participante ep
       SET notificado_at = $3
       FROM agenda_evento e
       WHERE ep.evento_id = e.id
         AND ${AVISO_PENDIENTE_WHERE}`,
      [tenantId, usuarioId, notificadoAt],
    );
  },
};
