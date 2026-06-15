import type { PersonaRow } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

type PersonaListRow = {
  id: string;
  tipo: string | null;
  nombre: string | null;
  apellido: string | null;
  documento: string | null;
  cuil: string | null;
  cuit: string | null;
  persona_contacto: Array<{
    id: string;
    canal: string;
    valor: string;
    predeterminado: boolean;
    deleted_at: string | null;
  }> | null;
};

export const personaRepository = {
  async getAll(ctx: DbContext): Promise<PersonaListRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<PersonaListRow>(
      `SELECT
         p.id, p.tipo, p.nombre, p.apellido, p.documento, p.cuil, p.cuit,
         COALESCE(
           (
             SELECT json_agg(json_build_object(
               'id', pc.id,
               'canal', pc.canal,
               'valor', pc.valor,
               'predeterminado', pc.predeterminado,
               'deleted_at', pc.deleted_at
             ) ORDER BY pc.created_at)
             FROM persona_contacto pc
             WHERE pc.persona_id = p.id AND pc.deleted_at IS NULL
           ),
           '[]'::json
         ) AS persona_contacto
       FROM persona p
       WHERE p.tenant_id = $1 AND p.deleted_at IS NULL
       ORDER BY p.apellido ASC`,
      [tenantId],
    );
  },

  async getById(ctx: DbContext, id: string) {
    let sql = `SELECT id, tipo, nombre, apellido, documento, cuil, cuit, sexo, fecha_nacimiento
               FROM persona
               WHERE id = $1 AND deleted_at IS NULL`;
    const params: unknown[] = [id];

    if (ctx.tenant_id != null) {
      sql += ` AND tenant_id = $2`;
      params.push(ctx.tenant_id);
    }

    const data = await queryOne<PersonaRow>(sql, params);
    if (!data) throw new Error("Persona no encontrada");
    return data;
  },

  async create(ctx: DbContext, payload: Record<string, unknown>) {
    const tenantId = requireTenantId(ctx);
    const fullPayload = { ...payload, tenant_id: tenantId };
    const keys = Object.keys(fullPayload);
    const values = Object.values(fullPayload);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
    const row = await queryOne<PersonaRow>(
      `INSERT INTO persona (${keys.join(", ")}) VALUES (${placeholders}) RETURNING *`,
      values,
    );
    if (!row) throw new Error("Error al crear persona");
    return row;
  },

  async update(ctx: DbContext, id: string, payload: Record<string, unknown>) {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    if (keys.length === 0) return;
    const values = keys.map((k) => payload[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    await pgQuery(
      `UPDATE persona SET ${sets} WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2}`,
      [...values, id, tenantId],
    );
  },

  async delete(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE persona SET deleted_at = $1 WHERE id = $2 AND tenant_id = $3`,
      [nowIso(), id, tenantId],
    );
  },

  async findByDocumento(ctx: DbContext, documento: string, excludeId?: string) {
    const tenantId = requireTenantId(ctx);
    const params: unknown[] = [tenantId, documento];
    let sql = `SELECT id FROM persona WHERE tenant_id = $1 AND documento = $2 AND deleted_at IS NULL LIMIT 1`;
    if (excludeId) {
      sql += ` AND id <> $3`;
      params.push(excludeId);
    }
    return queryOne<{ id: string }>(sql, params);
  },

  async findByCuil(ctx: DbContext, cuil: string, excludeId?: string) {
    const tenantId = requireTenantId(ctx);
    const params: unknown[] = [tenantId, cuil];
    let sql = `SELECT id FROM persona WHERE tenant_id = $1 AND cuil = $2 AND deleted_at IS NULL LIMIT 1`;
    if (excludeId) {
      sql += ` AND id <> $3`;
      params.push(excludeId);
    }
    return queryOne<{ id: string }>(sql, params);
  },

  async findByCuit(ctx: DbContext, cuit: string, excludeId?: string) {
    const tenantId = requireTenantId(ctx);
    const params: unknown[] = [tenantId, cuit];
    let sql = `SELECT id FROM persona WHERE tenant_id = $1 AND cuit = $2 AND deleted_at IS NULL LIMIT 1`;
    if (excludeId) {
      sql += ` AND id <> $3`;
      params.push(excludeId);
    }
    return queryOne<{ id: string }>(sql, params);
  },
};
