import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

export type DomicilioRow = {
  id: string;
  categoria: string;
  calle: string;
  numero: string | null;
  piso: string | null;
  departamento: string | null;
  barrio: string | null;
  localidad_id: string | null;
  localidad_nombre: string | null;
  localidad_provincia_id: string | null;
  codigo_postal: string | null;
  descripcion: string | null;
  predeterminado: boolean;
  activo: boolean;
  created_at: string;
};

type DomicilioDbRow = {
  id: string;
  categoria: string;
  calle: string;
  numero: string | null;
  piso: string | null;
  departamento: string | null;
  barrio: string | null;
  localidad_id: string | null;
  codigo_postal: string | null;
  descripcion: string | null;
  predeterminado: boolean;
  activo: boolean;
  created_at: string;
  localidad_nombre: string | null;
  localidad_provincia_id: string | null;
};

const DOMICILIO_RETURNING = `
  pd.id, pd.categoria, pd.calle, pd.numero, pd.piso, pd.departamento, pd.barrio,
  pd.localidad_id, pd.codigo_postal, pd.descripcion, pd.predeterminado, pd.activo, pd.created_at,
  l.nombre AS localidad_nombre, l.provincia_id AS localidad_provincia_id`;

function mapRow(row: DomicilioDbRow): DomicilioRow {
  return {
    id: row.id,
    categoria: row.categoria,
    calle: row.calle,
    numero: row.numero ?? null,
    piso: row.piso ?? null,
    departamento: row.departamento ?? null,
    barrio: row.barrio ?? null,
    localidad_id: row.localidad_id ?? null,
    localidad_nombre: row.localidad_nombre ?? null,
    localidad_provincia_id: row.localidad_provincia_id ?? null,
    codigo_postal: row.codigo_postal ?? null,
    descripcion: row.descripcion ?? null,
    predeterminado: row.predeterminado,
    activo: row.activo,
    created_at: row.created_at,
  };
}

const DOMICILIO_FROM = `
  FROM persona_domicilio pd
  LEFT JOIN localidades l ON l.id = pd.localidad_id`;

export const personaDomicilioRepository = {
  async getAllByPersona(ctx: DbContext, personaId: string): Promise<DomicilioRow[]> {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<DomicilioDbRow>(
      `SELECT ${DOMICILIO_RETURNING}
       ${DOMICILIO_FROM}
       WHERE pd.tenant_id = $1 AND pd.persona_id = $2 AND pd.deleted_at IS NULL
       ORDER BY pd.created_at ASC`,
      [tenantId, personaId],
    );
    return rows.map(mapRow);
  },

  async create(
    ctx: DbContext,
    personaId: string,
    payload: {
      categoria: string;
      calle: string;
      numero?: string | null;
      piso?: string | null;
      departamento?: string | null;
      barrio?: string | null;
      localidad_id?: string | null;
      codigo_postal?: string | null;
      descripcion?: string | null;
      predeterminado: boolean;
      activo: boolean;
    },
  ): Promise<DomicilioRow> {
    const tenantId = requireTenantId(ctx);
    const inserted = await queryOne<{ id: string }>(
      `INSERT INTO persona_domicilio (
         tenant_id, persona_id, categoria, calle, numero, piso, departamento, barrio,
         localidad_id, codigo_postal, descripcion, predeterminado, activo
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING id`,
      [
        tenantId,
        personaId,
        payload.categoria,
        payload.calle,
        payload.numero ?? null,
        payload.piso ?? null,
        payload.departamento ?? null,
        payload.barrio ?? null,
        payload.localidad_id ?? null,
        payload.codigo_postal ?? null,
        payload.descripcion ?? null,
        payload.predeterminado,
        payload.activo,
      ],
    );
    if (!inserted) throw new Error("Error al crear domicilio");
    const full = await queryOne<DomicilioDbRow>(
      `SELECT ${DOMICILIO_RETURNING} ${DOMICILIO_FROM} WHERE pd.id = $1`,
      [inserted.id],
    );
    if (!full) throw new Error("Error al crear domicilio");
    return mapRow(full);
  },

  async update(
    ctx: DbContext,
    domicilioId: string,
    payload: Record<string, unknown>,
  ): Promise<DomicilioRow> {
    const tenantId = requireTenantId(ctx);
    const keys = Object.keys(payload).filter((k) => payload[k] !== undefined);
    if (keys.length === 0) throw new Error("Sin datos para actualizar");
    const values = keys.map((k) => payload[k]);
    const sets = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
    await pgQuery(
      `UPDATE persona_domicilio SET ${sets}
       WHERE id = $${keys.length + 1} AND tenant_id = $${keys.length + 2} AND deleted_at IS NULL`,
      [...values, domicilioId, tenantId],
    );
    const full = await queryOne<DomicilioDbRow>(
      `SELECT ${DOMICILIO_RETURNING} ${DOMICILIO_FROM}
       WHERE pd.id = $1 AND pd.tenant_id = $2 AND pd.deleted_at IS NULL`,
      [domicilioId, tenantId],
    );
    if (!full) throw new Error("Domicilio no encontrado");
    return mapRow(full);
  },

  async delete(ctx: DbContext, domicilioId: string): Promise<void> {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE persona_domicilio SET deleted_at = $1 WHERE id = $2 AND tenant_id = $3`,
      [nowIso(), domicilioId, tenantId],
    );
  },

  async setPredeterminado(
    ctx: DbContext,
    domicilioId: string,
    personaId: string,
  ): Promise<void> {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE persona_domicilio SET predeterminado = false
       WHERE persona_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`,
      [personaId, tenantId],
    );
    await pgQuery(
      `UPDATE persona_domicilio SET predeterminado = true
       WHERE id = $1 AND tenant_id = $2`,
      [domicilioId, tenantId],
    );
  },
};
