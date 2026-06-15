import type { AgendaHistorialAccion } from "@/lib/types/agenda";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

const HISTORIAL_EMBEDS = `
  h.id, h.evento_id, h.accion, h.detalle, h.created_at, h.usuario_id,
  (
    SELECT json_build_object(
      'id', u.id,
      'persona', json_build_object('tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido)
    )
    FROM usuario u
    LEFT JOIN persona p ON p.id = u.persona_id
    WHERE u.id = h.usuario_id
  ) AS usuario`;

export const agendaEventoHistorialRepository = {
  async listByEvento(ctx: DbContext, eventoId: string) {
    const tenantId = requireTenantId(ctx);
    return queryRows(
      `SELECT ${HISTORIAL_EMBEDS}
       FROM agenda_evento_historial h
       INNER JOIN agenda_evento e ON e.id = h.evento_id
       WHERE h.evento_id = $1 AND e.tenant_id = $2
       ORDER BY h.created_at DESC`,
      [eventoId, tenantId],
    );
  },

  async insert(
    ctx: DbContext,
    payload: {
      evento_id: string;
      accion: AgendaHistorialAccion;
      detalle?: Record<string, unknown> | null;
      usuario_id: string;
    },
  ) {
    await pgQuery(
      `INSERT INTO agenda_evento_historial (evento_id, accion, detalle, usuario_id)
       VALUES ($1, $2, $3, $4)`,
      [
        payload.evento_id,
        payload.accion,
        payload.detalle ?? null,
        payload.usuario_id,
      ],
    );
  },
};
