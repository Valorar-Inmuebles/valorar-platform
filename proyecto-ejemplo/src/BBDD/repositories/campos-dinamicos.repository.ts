import type { CampoDinamicoRow } from "@/lib/server/types/bbdd";
import type { CampoDinamicoOpcionInput } from "@/lib/validation/schemas/campo-dinamico.schema";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { ilikePattern, nowIso } from "@/BBDD/base/helpers";
import { queryCount, queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";
import { NotFoundError } from "@/lib/server/not-found-error";

export type CampoDinamicoListItem = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
};

export type CampoDinamicoAdminListItem = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  activo: boolean;
  updated_at: string;
  opciones_count: number;
};

export type CampoDinamicoOpcionDetail = {
  id: string;
  etiqueta: string;
  valor: string;
  orden: number;
  activo: boolean;
};

export type CampoDinamicoDetail = {
  id: string;
  tenant_id: string;
  contexto: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  placeholder: string | null;
  ayuda: string | null;
  valor_default: string | null;
  ancho_grilla: number;
  requerido: boolean;
  minimo: number | null;
  maximo: number | null;
  longitud_maxima: number | null;
  regex: string | null;
  buscable: boolean;
  filtrable: boolean;
  visible_tabla: boolean;
  activo: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
  opciones: CampoDinamicoOpcionDetail[];
};

export type CampoDinamicoWritePayload = {
  contexto: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  placeholder?: string | null;
  ayuda?: string | null;
  valor_default?: string | null;
  ancho_grilla: number;
  requerido: boolean;
  minimo?: number | null;
  maximo?: number | null;
  longitud_maxima?: number | null;
  regex?: string | null;
  buscable: boolean;
  filtrable: boolean;
  visible_tabla: boolean;
  activo: boolean;
};

const SEARCH_LIMIT = 30;

function mapDetail(
  row: CampoDinamicoRow & { opciones: CampoDinamicoOpcionDetail[] | null },
): CampoDinamicoDetail {
  const opciones = (row.opciones ?? []).slice().sort((a, b) => a.orden - b.orden);
  return { ...row, opciones } as CampoDinamicoDetail;
}

export const camposDinamicosRepository = {
  async searchByContexto(ctx: DbContext, contexto: string, query?: string) {
    const tenantId = requireTenantId(ctx);
    const q = query?.trim();
    if (q && q.length >= 2) {
      const pattern = ilikePattern(q);
      return queryRows<CampoDinamicoListItem>(
        `SELECT id, clave, etiqueta, tipo FROM campos_dinamicos
         WHERE tenant_id = $1 AND contexto = $2 AND activo = true
           AND (etiqueta ILIKE $3 OR clave ILIKE $3)
         ORDER BY etiqueta ASC LIMIT $4`,
        [tenantId, contexto, pattern, SEARCH_LIMIT],
      );
    }
    return queryRows<CampoDinamicoListItem>(
      `SELECT id, clave, etiqueta, tipo FROM campos_dinamicos
       WHERE tenant_id = $1 AND contexto = $2 AND activo = true
       ORDER BY etiqueta ASC LIMIT $3`,
      [tenantId, contexto, SEARCH_LIMIT],
    );
  },

  async getActiveByIds(ctx: DbContext, contexto: string, ids: string[]) {
    if (ids.length === 0) return [];
    const tenantId = requireTenantId(ctx);
    return queryRows<CampoDinamicoListItem>(
      `SELECT id, clave, etiqueta, tipo FROM campos_dinamicos
       WHERE tenant_id = $1 AND contexto = $2 AND activo = true AND id = ANY($3::uuid[])`,
      [tenantId, contexto, ids],
    );
  },

  async listByContexto(ctx: DbContext, contexto: string) {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<{
      id: string;
      clave: string;
      etiqueta: string;
      tipo: string;
      activo: boolean;
      updated_at: string;
      opciones_count: number;
    }>(
      `SELECT cd.id, cd.clave, cd.etiqueta, cd.tipo, cd.activo, cd.updated_at,
              (SELECT COUNT(*)::int FROM campo_dinamico_opciones o WHERE o.campo_dinamico_id = cd.id) AS opciones_count
       FROM campos_dinamicos cd
       WHERE cd.tenant_id = $1 AND cd.contexto = $2
       ORDER BY cd.etiqueta ASC`,
      [tenantId, contexto],
    );
    return rows as CampoDinamicoAdminListItem[];
  },

  async listActiveWithOpcionesByContexto(
    ctx: DbContext,
    contexto: string,
    ids: string[],
  ): Promise<CampoDinamicoDetail[]> {
    const tenantId = requireTenantId(ctx);
    const uniqueIds = [...new Set(ids)];

    if (uniqueIds.length === 0) {
      return [];
    }

    const rows = await queryRows<
      CampoDinamicoRow & { opciones: CampoDinamicoOpcionDetail[] | null }
    >(
      `SELECT cd.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', o.id, 'etiqueta', o.etiqueta, 'valor', o.valor,
                  'orden', o.orden, 'activo', o.activo
                ) ORDER BY o.orden ASC, o.id ASC)
                FROM campo_dinamico_opciones o WHERE o.campo_dinamico_id = cd.id),
                '[]'::json
              ) AS opciones
       FROM campos_dinamicos cd
       WHERE cd.tenant_id = $1
         AND cd.contexto = $2
         AND cd.activo = true
         AND cd.id = ANY($3::uuid[])`,
      [tenantId, contexto, uniqueIds],
    );

    if (rows.length !== uniqueIds.length) {
      throw new NotFoundError("Campo dinámico no encontrado");
    }

    const byId = new Map(rows.map((row) => [row.id, mapDetail(row)]));

    return uniqueIds.map((id) => {
      const detail = byId.get(id);
      if (!detail) {
        throw new NotFoundError("Campo dinámico no encontrado");
      }
      return detail;
    });
  },

  async getByIdWithOpciones(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<
      CampoDinamicoRow & { opciones: CampoDinamicoOpcionDetail[] | null }
    >(
      `SELECT cd.*,
              COALESCE(
                (SELECT json_agg(json_build_object(
                  'id', o.id, 'etiqueta', o.etiqueta, 'valor', o.valor,
                  'orden', o.orden, 'activo', o.activo
                ) ORDER BY o.orden)
                FROM campo_dinamico_opciones o WHERE o.campo_dinamico_id = cd.id),
                '[]'::json
              ) AS opciones
       FROM campos_dinamicos cd
       WHERE cd.tenant_id = $1 AND cd.id = $2`,
      [tenantId, id],
    );
    if (!row) return null;
    return mapDetail(row);
  },

  async findByClave(
    ctx: DbContext,
    contexto: string,
    clave: string,
    excludeId?: string,
  ) {
    const tenantId = requireTenantId(ctx);
    const params: unknown[] = [tenantId, contexto, clave];
    let sql = `SELECT id FROM campos_dinamicos WHERE tenant_id = $1 AND contexto = $2 AND clave = $3`;
    if (excludeId) {
      sql += ` AND id <> $4`;
      params.push(excludeId);
    }
    return queryOne<{ id: string }>(sql, params);
  },

  async insert(ctx: DbContext, payload: CampoDinamicoWritePayload) {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<{ id: string }>(
      `INSERT INTO campos_dinamicos (
         tenant_id, contexto, clave, etiqueta, tipo, placeholder, ayuda, valor_default,
         ancho_grilla, requerido, minimo, maximo, longitud_maxima, regex,
         buscable, filtrable, visible_tabla, activo, orden
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,0)
       RETURNING id`,
      [
        tenantId,
        payload.contexto,
        payload.clave,
        payload.etiqueta,
        payload.tipo,
        payload.placeholder ?? null,
        payload.ayuda ?? null,
        payload.valor_default ?? null,
        payload.ancho_grilla,
        payload.requerido,
        payload.minimo ?? null,
        payload.maximo ?? null,
        payload.longitud_maxima ?? null,
        payload.regex ?? null,
        payload.buscable,
        payload.filtrable,
        payload.visible_tabla,
        payload.activo,
      ],
    );
    if (!row) throw new Error("Error al crear campo dinámico");
    return row;
  },

  async update(
    ctx: DbContext,
    id: string,
    payload: Partial<CampoDinamicoWritePayload>,
  ) {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter(
      (k) => payload[k as keyof CampoDinamicoWritePayload] !== undefined,
    );
    if (keys.length === 0) return;
    const values = keys.map((k) => payload[k as keyof CampoDinamicoWritePayload]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    await pgQuery(
      `UPDATE campos_dinamicos SET ${sets}, updated_at = $${keys.length + 1}
       WHERE tenant_id = $${keys.length + 2} AND id = $${keys.length + 3}`,
      [...values, nowIso(), tenantId, id],
    );
  },

  async countPlantillaReferencias(_ctx: DbContext, campoDinamicoId: string) {
    return queryCount(
      `SELECT COUNT(*)::text AS count FROM plantilla_campos WHERE campo_dinamico_id = $1`,
      [campoDinamicoId],
    );
  },

  async countValorReferencias(ctx: DbContext, campoDinamicoId: string) {
    const tenantId = requireTenantId(ctx);
    return queryCount(
      `SELECT COUNT(*)::text AS count FROM valores_dinamicos
       WHERE tenant_id = $1 AND campo_dinamico_id = $2`,
      [tenantId, campoDinamicoId],
    );
  },

  async syncOpciones(
    _ctx: DbContext,
    campoDinamicoId: string,
    opciones: CampoDinamicoOpcionInput[],
  ) {
    const existing = await queryRows<{ id: string }>(
      `SELECT id FROM campo_dinamico_opciones WHERE campo_dinamico_id = $1`,
      [campoDinamicoId],
    );

    const payloadIds = new Set(
      opciones
        .map((o) => o.id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    );

    for (const row of existing) {
      if (!payloadIds.has(row.id)) {
        await pgQuery(
          `UPDATE campo_dinamico_opciones SET activo = false
           WHERE id = $1 AND campo_dinamico_id = $2`,
          [row.id, campoDinamicoId],
        );
      }
    }

    for (const opcion of opciones) {
      if (opcion.id) {
        await pgQuery(
          `UPDATE campo_dinamico_opciones
           SET etiqueta = $1, valor = $2, orden = $3, activo = $4
           WHERE id = $5 AND campo_dinamico_id = $6`,
          [
            opcion.etiqueta,
            opcion.valor,
            opcion.orden,
            opcion.activo,
            opcion.id,
            campoDinamicoId,
          ],
        );
      } else {
        await pgQuery(
          `INSERT INTO campo_dinamico_opciones (campo_dinamico_id, etiqueta, valor, orden, activo)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            campoDinamicoId,
            opcion.etiqueta,
            opcion.valor,
            opcion.orden,
            opcion.activo,
          ],
        );
      }
    }
  },
};
