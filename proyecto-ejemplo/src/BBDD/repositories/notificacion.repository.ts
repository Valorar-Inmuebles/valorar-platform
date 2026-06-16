import type { DbContext } from "@/BBDD/base/types";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export type NotificacionInsertRow = {
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link?: string | null;
  leida?: boolean;
};

export type NotificacionRow = {
  id: string;
  usuario_id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  link: string | null;
  leida: boolean;
  created_at: string;
};

const NOTIFICACION_SELECT =
  "id, usuario_id, tipo, titulo, mensaje, link, leida, created_at";

export const notificacionRepository = {
  async createMany(_ctx: DbContext, rows: NotificacionInsertRow[]) {
    if (rows.length === 0) return;

    const values: unknown[] = [];
    const tuples: string[] = [];
    let idx = 1;

    for (const row of rows) {
      tuples.push(
        `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`,
      );
      values.push(
        row.usuario_id,
        row.tipo,
        row.titulo,
        row.mensaje,
        row.link ?? null,
        row.leida ?? false,
      );
    }

    await pgQuery(
      `INSERT INTO notificacion (usuario_id, tipo, titulo, mensaje, link, leida)
       VALUES ${tuples.join(", ")}`,
      values,
    );
  },

  /** Una query: total no leídas + preview de no leídas (polling). */
  async pollUnread(_ctx: DbContext, usuarioId: string, limit = 20) {
    const rows = await queryRows<
      NotificacionRow & { unread_count: string }
    >(
      `SELECT
         COUNT(*) OVER()::text AS unread_count,
         ${NOTIFICACION_SELECT}
       FROM notificacion
       WHERE usuario_id = $1 AND leida = false
       ORDER BY created_at DESC
       LIMIT $2`,
      [usuarioId, limit],
    );

    return {
      unreadCount: rows[0] ? Number(rows[0].unread_count) : 0,
      items: rows.map(({ unread_count: _count, ...row }) => row),
    };
  },

  /** Una query: total no leídas + últimas recientes (leídas y no leídas). */
  async listSummary(_ctx: DbContext, usuarioId: string, limit = 20) {
    const row = await queryOne<{
      unread_count: string;
      items: NotificacionRow[] | null;
    }>(
      `SELECT
         (SELECT COUNT(*)::text
          FROM notificacion
          WHERE usuario_id = $1 AND leida = false) AS unread_count,
         COALESCE(
           (SELECT json_agg(sub ORDER BY sub.created_at DESC)
            FROM (
              SELECT ${NOTIFICACION_SELECT}
              FROM notificacion
              WHERE usuario_id = $1
              ORDER BY created_at DESC
              LIMIT $2
            ) sub),
           '[]'::json
         ) AS items`,
      [usuarioId, limit],
    );

    return {
      unreadCount: Number(row?.unread_count ?? 0),
      items: row?.items ?? [],
    };
  },

  async markAsRead(_ctx: DbContext, usuarioId: string, id: string) {
    return queryOne<NotificacionRow>(
      `UPDATE notificacion SET leida = true
       WHERE id = $1 AND usuario_id = $2
       RETURNING ${NOTIFICACION_SELECT}`,
      [id, usuarioId],
    );
  },

  async markAllAsRead(_ctx: DbContext, usuarioId: string) {
    await pgQuery(
      `UPDATE notificacion SET leida = true WHERE usuario_id = $1 AND leida = false`,
      [usuarioId],
    );
  },
};
