import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryCount, queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

const CONTACTO_SELECT =
  "id, canal, categoria, valor, descripcion, predeterminado, verificado, pais_codigo, created_at";

export type PersonaContactoRow = {
  id: string;
  canal: string;
  categoria: string;
  valor: string;
  descripcion: string | null;
  predeterminado: boolean;
  verificado: boolean;
  pais_codigo: string;
  created_at: string;
};

export const personaContactoRepository = {
  async getAllByPersona(ctx: DbContext, personaId: string) {
    const tenantId = requireTenantId(ctx);
    return queryRows<PersonaContactoRow>(
      `SELECT ${CONTACTO_SELECT}
       FROM persona_contacto
       WHERE tenant_id = $1 AND persona_id = $2 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [tenantId, personaId],
    );
  },

  async create(
    ctx: DbContext,
    personaId: string,
    payload: {
      canal: string;
      categoria: string;
      valor: string;
      descripcion?: string | null;
      predeterminado: boolean;
      verificado: boolean;
      pais_codigo: string;
    },
  ) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<PersonaContactoRow>(
      `INSERT INTO persona_contacto (
         tenant_id, persona_id, canal, categoria, valor, descripcion,
         predeterminado, verificado, pais_codigo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${CONTACTO_SELECT}`,
      [
        tenantId,
        personaId,
        payload.canal,
        payload.categoria,
        payload.valor,
        payload.descripcion ?? null,
        payload.predeterminado,
        payload.verificado,
        payload.pais_codigo,
      ],
    );
    if (!row) throw new Error("Error al crear contacto");
    return row;
  },

  async update(
    ctx: DbContext,
    contactoId: string,
    payload: Record<string, unknown>,
  ) {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    if (keys.length === 0) throw new Error("Sin datos para actualizar");
    const values = keys.map((k) => payload[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    const row = await queryOne<PersonaContactoRow>(
      `UPDATE persona_contacto SET ${sets}
       WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2} AND deleted_at IS NULL
       RETURNING ${CONTACTO_SELECT}`,
      [...values, contactoId, tenantId],
    );
    if (!row) throw new Error("Contacto no encontrado");
    return row;
  },

  async delete(ctx: DbContext, contactoId: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE persona_contacto SET deleted_at = $1 WHERE id = $2 AND tenant_id = $3`,
      [nowIso(), contactoId, tenantId],
    );
  },

  async setPredeterminado(
    ctx: DbContext,
    contactoId: string,
    personaId: string,
    canal: string,
  ) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE persona_contacto SET predeterminado = false
       WHERE persona_id = $1 AND canal = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [personaId, canal, tenantId],
    );
    await pgQuery(
      `UPDATE persona_contacto SET predeterminado = true
       WHERE id = $1 AND tenant_id = $2`,
      [contactoId, tenantId],
    );
  },

  async countByCanal(
    ctx: DbContext,
    personaId: string,
    canal: string,
  ): Promise<number> {
    const tenantId = requireTenantId(ctx);
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM persona_contacto
       WHERE persona_id = $1 AND canal = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
      [personaId, canal, tenantId],
    );
  },
};
