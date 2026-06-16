import type { CasoUpdate } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import { NotFoundError } from "@/lib/server/not-found-error";

export type CasoRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  descripcion: string | null;
  estado: string | null;
  nombre: string | null;
  numero: string | null;
  plantilla_id: string | null;
  practica_id: string;
  created_at: string | null;
};

export type CasoListQueryRow = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  estado: string | null;
  nombre: string | null;
  numero: string | null;
  practica_id: string;
  created_at: string | null;
  cliente: {
    persona: {
      tipo: string | null;
      nombre: string | null;
      apellido: string | null;
    } | null;
  } | null;
  practica: { nombre: string } | null;
};

const CASO_FIELDS =
  "id, tenant_id, cliente_id, descripcion, estado, nombre, numero, plantilla_id, practica_id, created_at";

export const casoRepository = {
  async getAll(ctx: DbContext): Promise<CasoListQueryRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<CasoListQueryRow>(
      `SELECT
         c.id, c.tenant_id, c.cliente_id, c.estado, c.nombre, c.numero,
         c.practica_id, c.created_at,
         json_build_object(
           'persona', json_build_object(
             'tipo', p.tipo,
             'nombre', p.nombre,
             'apellido', p.apellido
           )
         ) AS cliente,
         json_build_object('nombre', pr.nombre) AS practica
       FROM caso c
       LEFT JOIN cliente cl ON cl.id = c.cliente_id
       LEFT JOIN persona p ON p.id = cl.persona_id
       LEFT JOIN practica pr ON pr.id = c.practica_id
       WHERE c.tenant_id = $1 AND c.deleted_at IS NULL
       ORDER BY c.numero ASC NULLS LAST`,
      [tenantId],
    );
  },

  async getById(ctx: DbContext, id: string): Promise<CasoRow> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<CasoRow>(
      `SELECT ${CASO_FIELDS}
       FROM caso
       WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [id, tenantId],
    );
    if (!row) throw new NotFoundError("Caso no encontrado");
    return row;
  },

  async create(
    ctx: DbContext,
    payload: {
      cliente_id: string;
      nombre: string | null;
      descripcion?: string | null;
      estado?: string | null;
      practica_id: string;
      plantilla_id?: string | null;
    },
  ): Promise<CasoRow> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<CasoRow>(
      `INSERT INTO caso (
         tenant_id, cliente_id, nombre, descripcion, estado, practica_id, plantilla_id
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING ${CASO_FIELDS}`,
      [
        tenantId,
        payload.cliente_id,
        payload.nombre,
        payload.descripcion ?? null,
        payload.estado ?? null,
        payload.practica_id,
        payload.plantilla_id ?? null,
      ],
    );
    if (!row) throw new Error("Error al crear caso");
    return row;
  },

  async update(ctx: DbContext, id: string, payload: CasoUpdate) {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter(
      (k) => payload[k as keyof CasoUpdate] !== undefined,
    );
    if (keys.length === 0) {
      throw new NotFoundError("Caso no encontrado");
    }
    const values = keys.map((k) => payload[k as keyof CasoUpdate]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const rows = await queryRows<{ id: string }>(
      `UPDATE caso SET ${sets}
       WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2} AND deleted_at IS NULL
       RETURNING id`,
      [...values, id, tenantId],
    );
    if (!rows.length) throw new NotFoundError("Caso no encontrado");
  },

  async delete(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE caso SET deleted_at = $1
       WHERE id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [nowIso(), id, tenantId],
    );
  },
};
