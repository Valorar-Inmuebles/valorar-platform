import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export const PLANTILLA_CONTEXTO_CASO = "caso";
export const PLANTILLA_CONTEXTO_EXPEDIENTE = "expediente";

export type PlantillaForPracticaItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  prioridad: number;
};

async function resolvePlantillaId(
  ctx: DbContext,
  expectedContexto: string,
  extraWhere: string,
  extraParams: unknown[],
): Promise<string | null> {
  const tenantId = requireTenantId(ctx);
  const row = await queryOne<{
    plantilla_id: string;
    contexto: string;
    activo: boolean;
  }>(
    `SELECT rp.plantilla_id, pe.contexto, pe.activo
     FROM reglas_plantillas rp
     INNER JOIN plantillas_entidades pe ON pe.id = rp.plantilla_id
     WHERE rp.tenant_id = $1 AND rp.activo = true AND rp.contexto = $2
       ${extraWhere}
     ORDER BY rp.prioridad DESC
     LIMIT 1`,
    [tenantId, expectedContexto, ...extraParams],
  );
  if (!row || row.contexto !== expectedContexto || !row.activo) return null;
  return row.plantilla_id;
}

export const reglasPlantillaRepository = {
  async resolvePlantillaIdForCasoByPractica(ctx: DbContext, practicaId: string) {
    return resolvePlantillaId(
      ctx,
      PLANTILLA_CONTEXTO_CASO,
      "AND rp.practica_id = $3",
      [practicaId],
    );
  },

  async resolvePlantillaIdForExpediente(
    ctx: DbContext,
    fueroId: string,
    objetoId: string,
  ) {
    return resolvePlantillaId(
      ctx,
      PLANTILLA_CONTEXTO_EXPEDIENTE,
      "AND rp.fuero_id = $3 AND rp.objeto_id = $4",
      [fueroId, objetoId],
    );
  },

  async listPlantillasForPractica(
    ctx: DbContext,
    practicaId: string,
  ): Promise<PlantillaForPracticaItem[]> {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<{
      prioridad: number;
      id: string;
      nombre: string;
      descripcion: string | null;
      contexto: string;
      activo: boolean;
    }>(
      `SELECT rp.prioridad, pe.id, pe.nombre, pe.descripcion, pe.contexto, pe.activo
       FROM reglas_plantillas rp
       INNER JOIN plantillas_entidades pe ON pe.id = rp.plantilla_id
       WHERE rp.tenant_id = $1 AND rp.contexto = $2 AND rp.practica_id = $3
         AND rp.activo = true
       ORDER BY rp.prioridad DESC`,
      [tenantId, PLANTILLA_CONTEXTO_CASO, practicaId],
    );

    return rows
      .filter((r) => r.contexto === PLANTILLA_CONTEXTO_CASO && r.activo)
      .map((r) => ({
        id: r.id,
        nombre: r.nombre,
        descripcion: r.descripcion,
        prioridad: r.prioridad,
      }));
  },

  async upsertReglaForCaso(
    ctx: DbContext,
    payload: { practica_id: string; plantilla_id: string; prioridad: number },
  ): Promise<string> {
    const tenantId = requireTenantId(ctx);
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM reglas_plantillas
       WHERE tenant_id = $1 AND contexto = $2 AND practica_id = $3 AND plantilla_id = $4`,
      [
        tenantId,
        PLANTILLA_CONTEXTO_CASO,
        payload.practica_id,
        payload.plantilla_id,
      ],
    );

    if (existing?.id) {
      await pgQuery(
        `UPDATE reglas_plantillas SET prioridad = $1, activo = true
         WHERE id = $2 AND tenant_id = $3`,
        [payload.prioridad, existing.id, tenantId],
      );
      return existing.id;
    }

    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO reglas_plantillas (
         tenant_id, contexto, jurisdiccion_id, practica_id, fuero_id, objeto_id,
         plantilla_id, prioridad, activo
       ) VALUES ($1, $2, NULL, $3, NULL, NULL, $4, $5, true)
       RETURNING id`,
      [
        tenantId,
        PLANTILLA_CONTEXTO_CASO,
        payload.practica_id,
        payload.plantilla_id,
        payload.prioridad,
      ],
    );
    if (!inserted) throw new Error("Error al crear regla");
    return inserted.id;
  },

  async upsertReglaForExpediente(
    ctx: DbContext,
    payload: {
      fuero_id: string;
      objeto_id: string;
      plantilla_id: string;
      prioridad: number;
    },
  ): Promise<string> {
    const tenantId = requireTenantId(ctx);
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM reglas_plantillas
       WHERE tenant_id = $1 AND contexto = $2 AND fuero_id = $3 AND objeto_id = $4
         AND plantilla_id = $5`,
      [
        tenantId,
        PLANTILLA_CONTEXTO_EXPEDIENTE,
        payload.fuero_id,
        payload.objeto_id,
        payload.plantilla_id,
      ],
    );

    if (existing?.id) {
      await pgQuery(
        `UPDATE reglas_plantillas SET prioridad = $1, activo = true
         WHERE id = $2 AND tenant_id = $3`,
        [payload.prioridad, existing.id, tenantId],
      );
      return existing.id;
    }

    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO reglas_plantillas (
         tenant_id, contexto, fuero_id, objeto_id, jurisdiccion_id, practica_id,
         plantilla_id, prioridad, activo
       ) VALUES ($1, $2, $3, $4, NULL, NULL, $5, $6, true)
       RETURNING id`,
      [
        tenantId,
        PLANTILLA_CONTEXTO_EXPEDIENTE,
        payload.fuero_id,
        payload.objeto_id,
        payload.plantilla_id,
        payload.prioridad,
      ],
    );
    if (!inserted) throw new Error("Error al crear regla");
    return inserted.id;
  },

  async getPrioridadForCasoRegla(
    ctx: DbContext,
    practicaId: string,
    plantillaId: string,
  ) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ prioridad: number }>(
      `SELECT prioridad FROM reglas_plantillas
       WHERE tenant_id = $1 AND activo = true AND contexto = $2
         AND practica_id = $3 AND plantilla_id = $4`,
      [tenantId, PLANTILLA_CONTEXTO_CASO, practicaId, plantillaId],
    );
    return row?.prioridad ?? null;
  },

  async listActiveByPlantillaId(ctx: DbContext, plantillaId: string) {
    const tenantId = requireTenantId(ctx);
    return queryRows<{
      id: string;
      prioridad: number;
      activo: boolean;
      jurisdiccion_id: string | null;
      practica_id: string | null;
      fuero_id: string | null;
      objeto_id: string | null;
    }>(
      `SELECT id, prioridad, activo, jurisdiccion_id, practica_id, fuero_id, objeto_id
       FROM reglas_plantillas
       WHERE tenant_id = $1 AND plantilla_id = $2 AND activo = true
       ORDER BY prioridad DESC`,
      [tenantId, plantillaId],
    );
  },

  async getPrioridadForExpedienteRegla(
    ctx: DbContext,
    fueroId: string,
    objetoId: string,
    plantillaId: string,
  ) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ prioridad: number }>(
      `SELECT prioridad FROM reglas_plantillas
       WHERE tenant_id = $1 AND activo = true AND contexto = $2
         AND fuero_id = $3 AND objeto_id = $4 AND plantilla_id = $5`,
      [
        tenantId,
        PLANTILLA_CONTEXTO_EXPEDIENTE,
        fueroId,
        objetoId,
        plantillaId,
      ],
    );
    return row?.prioridad ?? null;
  },
};
