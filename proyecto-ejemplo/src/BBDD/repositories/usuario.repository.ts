import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryOne, queryRows } from "@/BBDD/base/query";
import sql from "@/BBDD/base/db";

export type UsuarioListQueryRow = {
  id: string;
  activo: boolean | null;
  created_at: string | null;
  email: string | null;
  ultimo_login_at: string | null;
  tenant_nombre?: string | null;
  persona: {
    tipo: string | null;
    nombre: string | null;
    apellido: string | null;
  } | null;
  usuario_rol: Array<{
    rol: {
      id: string;
      nombre: string;
    } | null;
  }> | null;
};

export type UsuarioDetailQueryRow = {
  id: string;
  activo: boolean | null;
  persona_id: string;
  email: string | null;
  tenant_id: string | null;
  foto_url: string | null;
  persona: {
    tipo: string | null;
    nombre: string | null;
    apellido: string | null;
  } | null;
  usuario_rol: Array<{
    rol_id: string;
    rol: {
      id: string;
      nombre: string;
    } | null;
  }> | null;
};

const PERSONA_JSON = `json_build_object(
  'tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido
)`;

const ROLES_LIST_JSON = `COALESCE(
  (
    SELECT json_agg(json_build_object(
      'rol', json_build_object('id', r.id, 'nombre', r.nombre)
    ))
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = u.id
  ),
  '[]'::json
)`;

const ROLES_DETAIL_JSON = `COALESCE(
  (
    SELECT json_agg(json_build_object(
      'rol_id', ur.rol_id,
      'rol', json_build_object('id', r.id, 'nombre', r.nombre)
    ))
    FROM usuario_rol ur
    JOIN rol r ON r.id = ur.rol_id
    WHERE ur.usuario_id = u.id
  ),
  '[]'::json
)`;

export const usuarioRepository = {
  async listActivosForPicker(
    ctx: DbContext,
  ): Promise<Array<{ id: string; persona: UsuarioListQueryRow["persona"] }>> {
    const tenantId = requireTenantId(ctx);
    return queryRows<{ id: string; persona: UsuarioListQueryRow["persona"] }>(
      `SELECT u.id, ${PERSONA_JSON} AS persona
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.tenant_id = $1 AND u.activo = true
       ORDER BY p.apellido ASC NULLS LAST, p.nombre ASC NULLS LAST`,
      [tenantId],
    );
  },

  async countActivosByIds(ctx: DbContext, ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM usuario
       WHERE tenant_id = $1 AND activo = true AND id = ANY($2::uuid[])`,
      [tenantId, ids],
    );
    return row?.count ?? 0;
  },

  async getAll(ctx: DbContext): Promise<UsuarioListQueryRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<UsuarioListQueryRow>(
      `SELECT
         u.id, u.activo, u.created_at, u.email, u.ultimo_login_at,
         ${PERSONA_JSON} AS persona,
         ${ROLES_LIST_JSON} AS usuario_rol
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.tenant_id = $1
       ORDER BY u.created_at DESC`,
      [tenantId],
    );
  },

  async getAllGlobal(): Promise<UsuarioListQueryRow[]> {
    return queryRows<UsuarioListQueryRow>(
      `SELECT
         u.id, u.activo, u.created_at, u.email, u.ultimo_login_at,
         t.nombre AS tenant_nombre,
         ${PERSONA_JSON} AS persona,
         ${ROLES_LIST_JSON} AS usuario_rol
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       LEFT JOIN tenant t ON t.id = u.tenant_id
       ORDER BY t.nombre ASC NULLS LAST, u.created_at DESC`,
    );
  },

  async getById(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne<UsuarioDetailQueryRow>(
      `SELECT
         u.id, u.activo, u.persona_id, u.email, u.tenant_id, u.foto_url,
         ${PERSONA_JSON} AS persona,
         ${ROLES_DETAIL_JSON} AS usuario_rol
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.id = $1 AND u.tenant_id = $2`,
      [id, tenantId],
    );
  },

  async getByIdGlobal(id: string) {
    return queryOne<UsuarioDetailQueryRow>(
      `SELECT
         u.id, u.activo, u.persona_id, u.email, u.tenant_id, u.foto_url,
         ${PERSONA_JSON} AS persona,
         ${ROLES_DETAIL_JSON} AS usuario_rol
       FROM usuario u
       LEFT JOIN persona p ON p.id = u.persona_id
       WHERE u.id = $1`,
      [id],
    );
  },

  async getTenantIdByUsuarioId(id: string): Promise<string | null> {
    const row = await queryOne<{ tenant_id: string }>(
      `SELECT tenant_id FROM usuario WHERE id = $1`,
      [id],
    );
    return row?.tenant_id ?? null;
  },

  async create(
    ctx: DbContext,
    payload: { id: string; persona_id: string; activo: boolean },
  ) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO usuario (id, persona_id, tenant_id, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [payload.id, payload.persona_id, tenantId, payload.activo],
    );
    if (!row) throw new Error("Error al crear usuario");
    return row;
  },

  async updateActivo(ctx: DbContext, id: string, activo: boolean) {
    const tenantId = requireTenantId(ctx);
    await sql.unsafe(
      `UPDATE usuario SET activo = $1 WHERE id = $2 AND tenant_id = $3`,
      [activo, id, tenantId],
    );
  },

  async updateActivoById(id: string, activo: boolean) {
    await sql.unsafe(`UPDATE usuario SET activo = $1 WHERE id = $2`, [
      activo,
      id,
    ]);
  },

  async moveToTenant(
    usuarioId: string,
    personaId: string,
    tenantId: string,
  ) {
    await sql.unsafe(`UPDATE usuario SET tenant_id = $1 WHERE id = $2`, [
      tenantId,
      usuarioId,
    ]);
    await sql.unsafe(`UPDATE persona SET tenant_id = $1 WHERE id = $2`, [
      tenantId,
      personaId,
    ]);
  },

  async updateFotoUrl(id: string, fotoUrl: string | null) {
    await sql.unsafe(`UPDATE usuario SET foto_url = $1 WHERE id = $2`, [
      fotoUrl,
      id,
    ]);
  },

  async replaceRoles(_ctx: DbContext, usuarioId: string, rolIds: string[]) {
    await sql.unsafe(`DELETE FROM usuario_rol WHERE usuario_id = $1`, [usuarioId]);
    if (rolIds.length === 0) return;
    await sql.unsafe(
      `INSERT INTO usuario_rol (usuario_id, rol_id)
       SELECT $1, unnest($2::uuid[])`,
      [usuarioId, rolIds],
    );
  },

  async deleteById(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    await sql.unsafe(`DELETE FROM usuario WHERE id = $1 AND tenant_id = $2`, [
      id,
      tenantId,
    ]);
  },
};
