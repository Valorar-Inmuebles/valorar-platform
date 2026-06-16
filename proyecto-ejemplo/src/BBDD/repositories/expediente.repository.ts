import type { ExpedienteUpdate } from "@/lib/server/types/bbdd";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryCount, queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import { NotFoundError } from "@/lib/server/not-found-error";

export type ExpedienteRow = {
  id: string;
  caso_id: string;
  nombre: string | null;
  organismo_id: string | null;
  parte_representada_id: string | null;
  tipo: string | null;
  created_at: string | null;
};

const EXPEDIENTE_FIELDS =
  "id, caso_id, nombre, organismo_id, parte_representada_id, tipo, created_at";

export const expedienteRepository = {
  async countByCaso(ctx: DbContext, casoId: string): Promise<number> {
    const tenantId = requireTenantId(ctx);
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM expediente
       WHERE caso_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [casoId, tenantId],
    );
  },

  async getAllByCaso(ctx: DbContext, casoId: string): Promise<ExpedienteRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<ExpedienteRow>(
      `SELECT ${EXPEDIENTE_FIELDS}
       FROM expediente
       WHERE caso_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [casoId, tenantId],
    );
  },

  async create(
    ctx: DbContext,
    casoId: string,
    payload: {
      nombre: string | null;
      tipo?: string | null;
      organismo_id?: string | null;
      parte_representada_id?: string | null;
    },
  ): Promise<ExpedienteRow> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<ExpedienteRow>(
      `INSERT INTO expediente (
         tenant_id, caso_id, nombre, tipo, organismo_id, parte_representada_id
       ) VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${EXPEDIENTE_FIELDS}`,
      [
        tenantId,
        casoId,
        payload.nombre,
        payload.tipo ?? null,
        payload.organismo_id ?? null,
        payload.parte_representada_id ?? null,
      ],
    );
    if (!row) throw new Error("Error al crear expediente");
    return row;
  },

  async update(
    ctx: DbContext,
    casoId: string,
    expedienteId: string,
    payload: ExpedienteUpdate,
  ): Promise<ExpedienteRow> {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter(
      (k) => payload[k as keyof ExpedienteUpdate] !== undefined,
    );
    if (keys.length === 0) throw new NotFoundError("Expediente no encontrado");
    const values = keys.map((k) => payload[k as keyof ExpedienteUpdate]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const row = await queryOne<ExpedienteRow>(
      `UPDATE expediente SET ${sets}
       WHERE id = $${keys.length + 1} AND caso_id = $${keys.length + 2}
         AND tenant_id = $${keys.length + 3} AND deleted_at IS NULL
       RETURNING ${EXPEDIENTE_FIELDS}`,
      [...values, expedienteId, casoId, tenantId],
    );
    if (!row) throw new NotFoundError("Expediente no encontrado");
    return row;
  },

  async delete(ctx: DbContext, casoId: string, expedienteId: string) {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<{ id: string }>(
      `UPDATE expediente SET deleted_at = $1
       WHERE id = $2 AND caso_id = $3 AND tenant_id = $4 AND deleted_at IS NULL
       RETURNING id`,
      [nowIso(), expedienteId, casoId, tenantId],
    );
    if (!rows.length) throw new NotFoundError("Expediente no encontrado");
  },
};
