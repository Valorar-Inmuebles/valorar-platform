import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { ilikePattern, nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

type ClientePersonaEmbed = {
  tipo: string | null;
  nombre: string | null;
  apellido: string | null;
  documento?: string | null;
  cuil?: string | null;
  cuit?: string | null;
  persona_contacto?: Array<{
    id: string;
    canal: string;
    valor: string;
    predeterminado: boolean;
    deleted_at: string | null;
  }>;
  persona_previsional?: {
    persona_id: string;
    numero_beneficio: number | null;
    secret: string;
  };
};

type ClienteListRow = {
  id: string;
  persona_id: string;
  persona: ClientePersonaEmbed;
};

type ClienteDetailRow = {
  id: string;
  persona: {
    id: string;
    tipo: string | null;
    nombre: string | null;
    apellido: string | null;
  };
};

type ClientePersonaIdRow = {
  id: string;
  persona_id: string;
  persona: ClientePersonaEmbed;
};

type ClienteSelectorRow = {
  id: string;
  persona: ClientePersonaEmbed;
};

function personaJsonSelect(alias: string): string {
  return `json_build_object(
    'tipo', ${alias}.tipo,
    'nombre', ${alias}.nombre,
    'apellido', ${alias}.apellido,
    'documento', ${alias}.documento,
    'cuil', ${alias}.cuil,
    'cuit', ${alias}.cuit
  )`;
}

const CLIENTE_PERSONA_CONTACTOS = `
  COALESCE(
    (
      SELECT json_agg(json_build_object(
        'id', pc.id,
        'canal', pc.canal,
        'valor', pc.valor,
        'predeterminado', pc.predeterminado,
        'deleted_at', pc.deleted_at
      ))
      FROM persona_contacto pc
      WHERE pc.persona_id = p.id AND pc.deleted_at IS NULL
    ),
    '[]'::json
  )`;

export const clienteRepository = {
  async getAll(ctx: DbContext): Promise<ClienteListRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<ClienteListRow>(
      `SELECT
         c.id,
         c.persona_id,
         json_build_object(
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido,
           'documento', p.documento,
           'cuil', p.cuil,
           'cuit', p.cuit,
           'persona_contacto', ${CLIENTE_PERSONA_CONTACTOS}
         ) AS persona
       FROM cliente c
       INNER JOIN persona p ON p.id = c.persona_id AND p.deleted_at IS NULL
       WHERE c.tenant_id = $1
         AND c.deleted_at IS NULL
       ORDER BY p.apellido ASC NULLS LAST, p.nombre ASC NULLS LAST`,
      [tenantId],
    );
  },

  async getAllWithPrevisionalByTenant(ctx: DbContext): Promise<ClienteListRow[]> {
    const tenantId = requireTenantId(ctx);
    return queryRows<ClienteListRow>(
      `SELECT
         c.id,
         c.persona_id,
         json_build_object(
           'id', p.id,
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido,
           'documento', p.documento,
           'cuil', p.cuil,
           'cuit', p.cuit,
           'persona_previsional', json_build_object(
             'persona_id', pp.persona_id,
             'numero_beneficio', pp.numero_beneficio,
             'secret', pp.secret
           )
         ) AS persona
       FROM cliente c
       INNER JOIN persona p ON p.id = c.persona_id AND p.deleted_at IS NULL
       INNER JOIN persona_previsional pp ON pp.persona_id = p.id
       WHERE c.tenant_id = $1
         AND c.deleted_at IS NULL
         AND pp.numero_beneficio IS NOT NULL
       ORDER BY c.created_at DESC`,
      [tenantId],
    );
  },

  async getById(_ctx: DbContext, id: string): Promise<ClienteDetailRow> {
    const row = await queryOne<ClienteDetailRow>(
      `SELECT
         c.id,
         json_build_object(
           'id', p.id,
           'tipo', p.tipo,
           'nombre', p.nombre,
           'apellido', p.apellido
         ) AS persona
       FROM cliente c
       LEFT JOIN persona p ON p.id = c.persona_id
       WHERE c.id = $1`,
      [id],
    );
    if (!row) throw new Error("Cliente no encontrado");
    return row;
  },

  async searchForSelector(
    ctx: DbContext,
    query: string,
    limit = 25,
  ): Promise<ClienteSelectorRow[]> {
    const tenantId = requireTenantId(ctx);
    const pattern = ilikePattern(query);
    return queryRows<ClienteSelectorRow>(
      `SELECT
         c.id,
         ${personaJsonSelect("p")} AS persona
       FROM cliente c
       INNER JOIN persona p ON p.id = c.persona_id AND p.deleted_at IS NULL
       WHERE c.tenant_id = $1
         AND c.deleted_at IS NULL
         AND (
           p.nombre ILIKE $2 OR p.apellido ILIKE $2 OR p.documento ILIKE $2
           OR p.cuil ILIKE $2 OR p.cuit ILIKE $2
         )
       LIMIT $3`,
      [tenantId, pattern, limit],
    );
  },

  async insertCliente(
    ctx: DbContext,
    payload: { tenant_id: string; persona_id: string },
  ) {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO cliente (tenant_id, persona_id) VALUES ($1, $2) RETURNING id`,
      [payload.tenant_id, payload.persona_id],
    );
    if (!row) throw new Error("Error al crear cliente");
    return row;
  },

  async getPersonaId(ctx: DbContext, clienteId: string): Promise<ClientePersonaIdRow | null> {
    const params: unknown[] = [clienteId];
    let tenantFilter = "";
    if (ctx.tenant_id != null) {
      tenantFilter = " AND c.tenant_id = $2";
      params.push(ctx.tenant_id);
    }

    return queryOne<ClientePersonaIdRow>(
      `SELECT
         c.id,
         c.persona_id,
         ${personaJsonSelect("p")} AS persona
       FROM cliente c
       INNER JOIN persona p ON p.id = c.persona_id AND p.deleted_at IS NULL
       WHERE c.id = $1 AND c.deleted_at IS NULL${tenantFilter}`,
      params,
    );
  },

  async softDelete(_ctx: DbContext, id: string) {
    await pgQuery(`UPDATE cliente SET deleted_at = $1 WHERE id = $2`, [
      nowIso(),
      id,
    ]);
  },
};
