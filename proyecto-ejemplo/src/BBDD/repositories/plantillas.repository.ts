import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export type PlantillaListItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
};

export type PlantillaAdminRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  contexto: string;
  activo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlantillaAdminListQueryRow = {
  id: string;
  nombre: string;
  contexto: string;
  activo: boolean;
  updated_at: string;
  reglas: Array<{
    prioridad: number;
    activo: boolean;
    jurisdiccion_id: string | null;
    practica_id: string | null;
    fuero_id: string | null;
    objeto_id: string | null;
    jurisdiccion: { nombre: string | null } | null;
    practica: { nombre: string } | null;
    fuero: { nombre: string } | null;
    objeto: { nombre: string } | null;
  }> | null;
  campos: Array<{ count: number }> | null;
};

export type PlantillaAdminListItem = {
  id: string;
  nombre: string;
  contexto: string;
  activo: boolean;
  updated_at: string;
  regla_resumen: string;
  campos_count: number;
};

const REGLAS_JSON = `COALESCE(
  (
    SELECT json_agg(json_build_object(
      'prioridad', rp.prioridad,
      'activo', rp.activo,
      'jurisdiccion_id', rp.jurisdiccion_id,
      'practica_id', rp.practica_id,
      'fuero_id', rp.fuero_id,
      'objeto_id', rp.objeto_id,
      'jurisdiccion', CASE WHEN j.id IS NOT NULL THEN json_build_object('nombre', j.nombre) ELSE NULL END,
      'practica', CASE WHEN pr.id IS NOT NULL THEN json_build_object('nombre', pr.nombre) ELSE NULL END,
      'fuero', CASE WHEN f.id IS NOT NULL THEN json_build_object('nombre', f.nombre) ELSE NULL END,
      'objeto', CASE WHEN o.id IS NOT NULL THEN json_build_object('nombre', o.nombre) ELSE NULL END
    ))
    FROM reglas_plantillas rp
    LEFT JOIN jurisdiccion j ON j.id = rp.jurisdiccion_id
    LEFT JOIN practica pr ON pr.id = rp.practica_id
    LEFT JOIN fuero f ON f.id = rp.fuero_id
    LEFT JOIN objeto o ON o.id = rp.objeto_id
    WHERE rp.plantilla_id = pe.id
  ),
  '[]'::json
)`;

export const plantillasRepository = {
  async listActiveByContexto(ctx: DbContext, contexto: string) {
    const tenantId = requireTenantId(ctx);
    return queryRows<PlantillaListItem>(
      `SELECT id, nombre, descripcion, activo
       FROM plantillas_entidades
       WHERE tenant_id = $1 AND contexto = $2 AND activo = true
       ORDER BY nombre ASC`,
      [tenantId, contexto],
    );
  },

  async getActiveByIdForContexto(
    ctx: DbContext,
    plantillaId: string,
    contexto: string,
  ) {
    const tenantId = requireTenantId(ctx);
    return queryOne<PlantillaListItem>(
      `SELECT id, nombre, descripcion, activo
       FROM plantillas_entidades
       WHERE id = $1 AND tenant_id = $2 AND contexto = $3 AND activo = true`,
      [plantillaId, tenantId, contexto],
    );
  },

  async getByIdForContexto(
    ctx: DbContext,
    plantillaId: string,
    contexto: string,
  ) {
    const tenantId = requireTenantId(ctx);
    return queryOne<PlantillaListItem>(
      `SELECT id, nombre, descripcion, activo
       FROM plantillas_entidades
       WHERE id = $1 AND tenant_id = $2 AND contexto = $3`,
      [plantillaId, tenantId, contexto],
    );
  },

  async listForAdmin(ctx: DbContext): Promise<PlantillaAdminListQueryRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<PlantillaAdminListQueryRow>(
      `SELECT
         pe.id, pe.nombre, pe.contexto, pe.activo, pe.updated_at,
         ${REGLAS_JSON} AS reglas,
         json_build_array(json_build_object(
           'count', (SELECT COUNT(*)::int FROM plantilla_campos pc WHERE pc.plantilla_id = pe.id)
         )) AS campos
       FROM plantillas_entidades pe
       WHERE pe.tenant_id = $1
       ORDER BY pe.updated_at DESC`,
      [tenantId],
    );
  },

  async getByIdForTenant(ctx: DbContext, plantillaId: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne<PlantillaAdminRow>(
      `SELECT id, nombre, descripcion, contexto, activo, created_at, updated_at
       FROM plantillas_entidades
       WHERE id = $1 AND tenant_id = $2`,
      [plantillaId, tenantId],
    );
  },

  async create(
    ctx: DbContext,
    payload: {
      nombre: string;
      descripcion?: string | null;
      contexto: string;
      activo?: boolean;
    },
  ): Promise<string> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO plantillas_entidades (tenant_id, nombre, descripcion, contexto, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [
        tenantId,
        payload.nombre,
        payload.descripcion ?? null,
        payload.contexto,
        payload.activo ?? true,
      ],
    );
    if (!row) throw new Error("Error al crear plantilla");
    return row.id;
  },

  async update(
    ctx: DbContext,
    plantillaId: string,
    payload: {
      nombre: string;
      descripcion?: string | null;
      activo?: boolean;
    },
  ) {
    const tenantId = requireTenantId(ctx);
    if (payload.activo !== undefined) {
      await pgQuery(
        `UPDATE plantillas_entidades
         SET nombre = $1, descripcion = $2, activo = $3, updated_at = $4
         WHERE id = $5 AND tenant_id = $6`,
        [
          payload.nombre,
          payload.descripcion ?? null,
          payload.activo,
          nowIso(),
          plantillaId,
          tenantId,
        ],
      );
    } else {
      await pgQuery(
        `UPDATE plantillas_entidades
         SET nombre = $1, descripcion = $2, updated_at = $3
         WHERE id = $4 AND tenant_id = $5`,
        [
          payload.nombre,
          payload.descripcion ?? null,
          nowIso(),
          plantillaId,
          tenantId,
        ],
      );
    }
  },
};
