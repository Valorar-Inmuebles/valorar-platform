import type { ComentarioEntidadTipo } from "@/lib/types/comentario";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { ilikePattern, nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import sql from "@/BBDD/base/db";

const USUARIO_PERSONA_JSON = `json_build_object(
  'id', u.id,
  'persona', json_build_object('tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido)
)`;

const COMENTARIO_EMBEDS = `
  c.id, c.entidad_tipo, c.entidad_id, c.contenido, c.created_at, c.updated_at,
  c.editado_at, c.usuario_id,
  (
    SELECT json_build_object(
      'id', u.id,
      'foto_url', u.foto_url,
      'persona', json_build_object('tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido)
    )
    FROM usuario u
    LEFT JOIN persona p ON p.id = u.persona_id
    WHERE u.id = c.usuario_id
  ) AS usuario,
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'usuario_id', cm.usuario_id,
        'usuario', (
          SELECT json_build_object(
            'id', mu.id,
            'persona', json_build_object(
              'tipo', mp.tipo, 'nombre', mp.nombre, 'apellido', mp.apellido
            )
          )
          FROM usuario mu
          LEFT JOIN persona mp ON mp.id = mu.persona_id
          WHERE mu.id = cm.usuario_id
        )
      ))
      FROM comentario_mencion cm
      WHERE cm.comentario_id = c.id
    ),
    '[]'::json
  ) AS comentario_mencion`;

export const comentarioRepository = {
  async listByEntidad(
    ctx: DbContext,
    entidadTipo: ComentarioEntidadTipo,
    entidadId: string,
  ) {
    const tenantId = requireTenantId(ctx);
    return queryRows(
      `SELECT ${COMENTARIO_EMBEDS}
       FROM comentario c
       WHERE c.tenant_id = $1 AND c.entidad_tipo = $2 AND c.entidad_id = $3
         AND c.deleted_at IS NULL
       ORDER BY c.created_at ASC`,
      [tenantId, entidadTipo, entidadId],
    );
  },

  async getById(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne(
      `SELECT ${COMENTARIO_EMBEDS}
       FROM comentario c
       WHERE c.id = $1 AND c.tenant_id = $2 AND c.deleted_at IS NULL`,
      [id, tenantId],
    );
  },

  async create(
    ctx: DbContext,
    payload: {
      entidad_tipo: ComentarioEntidadTipo;
      entidad_id: string;
      contenido: string;
      usuario_id: string;
    },
  ) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO comentario (
         tenant_id, entidad_tipo, entidad_id, contenido, usuario_id
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        tenantId,
        payload.entidad_tipo,
        payload.entidad_id,
        payload.contenido,
        payload.usuario_id,
      ],
    );
    if (!row) throw new Error("Error al crear comentario");
    return row;
  },

  async updateContenido(ctx: DbContext, id: string, contenido: string) {
    const tenantId = requireTenantId(ctx);
    const now = nowIso();
    await pgQuery(
      `UPDATE comentario SET contenido = $1, updated_at = $2, editado_at = $3
       WHERE id = $4 AND tenant_id = $5 AND deleted_at IS NULL`,
      [contenido, now, now, id, tenantId],
    );
  },

  async softDelete(ctx: DbContext, id: string, deletedBy: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE comentario SET deleted_at = $1, deleted_by = $2
       WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL`,
      [nowIso(), deletedBy, id, tenantId],
    );
  },

  async insertEdicion(
    _ctx: DbContext,
    payload: {
      comentario_id: string;
      contenido_anterior: string;
      editado_por: string;
    },
  ) {
    await pgQuery(
      `INSERT INTO comentario_edicion (comentario_id, contenido_anterior, editado_por)
       VALUES ($1, $2, $3)`,
      [payload.comentario_id, payload.contenido_anterior, payload.editado_por],
    );
  },

  async replaceMenciones(
    _ctx: DbContext,
    comentarioId: string,
    usuarioIds: string[],
  ) {
    await sql.begin(async (tx) => {
      await tx.unsafe(`DELETE FROM comentario_mencion WHERE comentario_id = $1`, [
        comentarioId,
      ]);
      for (const usuario_id of usuarioIds) {
        await tx.unsafe(
          `INSERT INTO comentario_mencion (comentario_id, usuario_id) VALUES ($1, $2)`,
          [comentarioId, usuario_id],
        );
      }
    });
  },

  async listUsuariosParaMencion(ctx: DbContext, query: string) {
    const tenantId = requireTenantId(ctx);
    const term = query.trim();
    if (term.length > 0) {
      const pattern = ilikePattern(term);
      return queryRows(
        `SELECT u.id, json_build_object(
           'tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido
         ) AS persona
         FROM usuario u
         LEFT JOIN persona p ON p.id = u.persona_id
         WHERE u.tenant_id = $1 AND u.activo = true
           AND (p.nombre ILIKE $2 OR p.apellido ILIKE $2)
         LIMIT 20`,
        [tenantId, pattern],
      );
    }
    return queryRows(
      `SELECT u.id, json_build_object(
         'tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido
       ) AS persona
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.tenant_id = $1 AND u.activo = true
       LIMIT 20`,
      [tenantId],
    );
  },

  async assertEntidadExists(
    ctx: DbContext,
    entidadTipo: ComentarioEntidadTipo,
    entidadId: string,
  ): Promise<boolean> {
    const tenantId = requireTenantId(ctx);

    if (entidadTipo === "legajo") {
      const row = await queryOne(
        `SELECT l.id
         FROM legajo l
         INNER JOIN caso c ON c.id = l.caso_id
         WHERE l.id = $1 AND c.tenant_id = $2`,
        [entidadId, tenantId],
      );
      return row != null;
    }

    if (entidadTipo === "evento") {
      const row = await queryOne(
        `SELECT id FROM agenda_evento
         WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
        [entidadId, tenantId],
      );
      return row != null;
    }

    const tableByTipo: Record<
      Exclude<ComentarioEntidadTipo, "legajo" | "evento">,
      string
    > = {
      expediente: "expediente",
      caso: "caso",
      cliente: "cliente",
      usuario: "usuario",
    };

    const table = tableByTipo[entidadTipo];
    const deletedFilter =
      entidadTipo !== "usuario" ? " AND deleted_at IS NULL" : "";

    const row = await queryOne(
      `SELECT id FROM ${table} WHERE id = $1 AND tenant_id = $2${deletedFilter} LIMIT 1`,
      [entidadId, tenantId],
    );
    return row != null;
  },
};
