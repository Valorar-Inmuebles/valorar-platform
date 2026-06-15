import type {
  AgendaEntidadPadreFilterTipo,
  AgendaEntidadTipo,
  AgendaEventoEstado,
  AgendaNotificarAntesUnidad,
} from "@/lib/types/agenda";
import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { nowIso } from "@/BBDD/base/helpers";
import { queryOne, queryRows } from "@/BBDD/base/query";
import { pgQuery } from "@/BBDD/base/executor";

const EVENTO_EMBEDS = `
  e.id, e.tenant_id, e.entidad_tipo, e.entidad_id, e.tipo_id,
  e.titulo, e.descripcion, e.ubicacion, e.observaciones,
  e.inicio_at, e.fin_at, e.todo_el_dia, e.estado, e.creado_por,
  e.notificar_antes_cantidad, e.notificar_antes_unidad,
  e.created_at, e.updated_at,
  (
    SELECT json_build_object(
      'id', t.id,
      'codigo', t.codigo,
      'nombre', t.nombre,
      'color_fondo', t.color_fondo,
      'color_texto', t.color_texto,
      'duracion_default_minutos', t.duracion_default_minutos
    )
    FROM agenda_evento_tipo t
    WHERE t.id = e.tipo_id
  ) AS tipo,
  (
    SELECT json_build_object(
      'id', u.id,
      'persona', json_build_object('tipo', p.tipo, 'nombre', p.nombre, 'apellido', p.apellido)
    )
    FROM usuario u
    LEFT JOIN persona p ON p.id = u.persona_id
    WHERE u.id = e.creado_por
  ) AS creado_por_usuario`;

export type AgendaEventoListFilters = {
  desde?: string;
  hasta?: string;
  tipo_id?: string;
  entidad_tipo?: AgendaEntidadTipo;
  entidad_id?: string;
  participante_id?: string;
  creado_por?: string;
  estado?: AgendaEventoEstado;
};

export const agendaEventoRepository = {
  async listByEntidad(
    ctx: DbContext,
    entidadTipo: AgendaEntidadTipo,
    entidadId: string,
  ) {
    const tenantId = requireTenantId(ctx);

    if (entidadTipo === "cliente") {
      return queryRows(
        `SELECT ${EVENTO_EMBEDS}
         FROM agenda_evento e
         WHERE e.tenant_id = $1
           AND e.deleted_at IS NULL
           AND (
             (e.entidad_tipo = 'cliente' AND e.entidad_id = $2)
             OR (
               e.entidad_tipo = 'caso'
               AND e.entidad_id IN (
                 SELECT c.id
                 FROM caso c
                 WHERE c.cliente_id = $2
                   AND c.tenant_id = $1
                   AND c.deleted_at IS NULL
               )
             )
           )
         ORDER BY e.inicio_at ASC`,
        [tenantId, entidadId],
      );
    }

    return queryRows(
      `SELECT ${EVENTO_EMBEDS}
       FROM agenda_evento e
       WHERE e.tenant_id = $1
         AND e.entidad_tipo = $2
         AND e.entidad_id = $3
         AND e.deleted_at IS NULL
       ORDER BY e.inicio_at ASC`,
      [tenantId, entidadTipo, entidadId],
    );
  },

  async listForTenant(ctx: DbContext, filters: AgendaEventoListFilters) {
    const tenantId = requireTenantId(ctx);
    const conditions = [
      "e.tenant_id = $1",
      "e.deleted_at IS NULL",
    ];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    if (filters.desde) {
      conditions.push(`e.inicio_at >= $${paramIndex}`);
      params.push(filters.desde);
      paramIndex += 1;
    }
    if (filters.hasta) {
      conditions.push(`e.inicio_at <= $${paramIndex}`);
      params.push(filters.hasta);
      paramIndex += 1;
    }
    if (filters.tipo_id) {
      conditions.push(`e.tipo_id = $${paramIndex}`);
      params.push(filters.tipo_id);
      paramIndex += 1;
    }
    if (filters.entidad_tipo === "cliente" && filters.entidad_id) {
      // Cliente: eventos del cliente + eventos de sus casos.
      conditions.push(`(
        (e.entidad_tipo = 'cliente' AND e.entidad_id = $${paramIndex})
        OR (
          e.entidad_tipo = 'caso'
          AND e.entidad_id IN (
            SELECT c.id
            FROM caso c
            WHERE c.cliente_id = $${paramIndex}
              AND c.tenant_id = $1
              AND c.deleted_at IS NULL
          )
        )
      )`);
      params.push(filters.entidad_id);
      paramIndex += 1;
    } else {
      if (filters.entidad_tipo) {
        conditions.push(`e.entidad_tipo = $${paramIndex}`);
        params.push(filters.entidad_tipo);
        paramIndex += 1;
      }
      if (filters.entidad_id) {
        conditions.push(`e.entidad_id = $${paramIndex}`);
        params.push(filters.entidad_id);
        paramIndex += 1;
      }
    }
    if (filters.creado_por) {
      conditions.push(`e.creado_por = $${paramIndex}`);
      params.push(filters.creado_por);
      paramIndex += 1;
    }
    if (filters.estado) {
      conditions.push(`e.estado = $${paramIndex}`);
      params.push(filters.estado);
      paramIndex += 1;
    }
    if (filters.participante_id) {
      conditions.push(`(
        e.creado_por = $${paramIndex}
        OR EXISTS (
          SELECT 1 FROM agenda_evento_participante ep
          WHERE ep.evento_id = e.id AND ep.usuario_id = $${paramIndex}
        )
      )`);
      params.push(filters.participante_id);
      paramIndex += 1;
    }

    return queryRows(
      `SELECT ${EVENTO_EMBEDS}
       FROM agenda_evento e
       WHERE ${conditions.join(" AND ")}
       ORDER BY e.inicio_at ASC`,
      params,
    );
  },

  async getById(ctx: DbContext, id: string) {
    const tenantId = requireTenantId(ctx);
    return queryOne(
      `SELECT ${EVENTO_EMBEDS}
       FROM agenda_evento e
       WHERE e.id = $1 AND e.tenant_id = $2 AND e.deleted_at IS NULL`,
      [id, tenantId],
    );
  },

  async create(
    ctx: DbContext,
    payload: {
      entidad_tipo: AgendaEntidadTipo | null;
      entidad_id: string | null;
      tipo_id: string;
      titulo: string;
      descripcion?: string | null;
      ubicacion?: string | null;
      observaciones?: string | null;
      inicio_at: string;
      fin_at: string | null;
      todo_el_dia: boolean;
      creado_por: string;
      notificar_antes_cantidad?: number | null;
      notificar_antes_unidad?: AgendaNotificarAntesUnidad | null;
    },
  ) {
    const tenantId = requireTenantId(ctx);
    const now = nowIso();
    const row = await queryOne<{ id: string }>(
      `INSERT INTO agenda_evento (
         tenant_id, entidad_tipo, entidad_id, tipo_id, titulo,
         descripcion, ubicacion, observaciones, inicio_at, fin_at,
         todo_el_dia, estado, creado_por,
         notificar_antes_cantidad, notificar_antes_unidad,
         created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'programado', $12, $13, $14, $15, $15)
       RETURNING id`,
      [
        tenantId,
        payload.entidad_tipo,
        payload.entidad_id,
        payload.tipo_id,
        payload.titulo,
        payload.descripcion ?? null,
        payload.ubicacion ?? null,
        payload.observaciones ?? null,
        payload.inicio_at,
        payload.fin_at,
        payload.todo_el_dia,
        payload.creado_por,
        payload.notificar_antes_cantidad ?? null,
        payload.notificar_antes_unidad ?? null,
        now,
      ],
    );
    if (!row) throw new Error("Error al crear evento");
    return row;
  },

  async update(
    ctx: DbContext,
    id: string,
    fields: {
      tipo_id?: string;
      titulo?: string;
      descripcion?: string | null;
      ubicacion?: string | null;
      observaciones?: string | null;
      inicio_at?: string;
      fin_at?: string | null;
      todo_el_dia?: boolean;
      estado?: AgendaEventoEstado;
      notificar_antes_cantidad?: number | null;
      notificar_antes_unidad?: AgendaNotificarAntesUnidad | null;
    },
  ) {
    const tenantId = requireTenantId(ctx);
    const sets: string[] = ["updated_at = $1"];
    const params: unknown[] = [nowIso()];
    let paramIndex = 2;

    const assign = (column: string, value: unknown) => {
      sets.push(`${column} = $${paramIndex}`);
      params.push(value);
      paramIndex += 1;
    };

    if (fields.tipo_id !== undefined) assign("tipo_id", fields.tipo_id);
    if (fields.titulo !== undefined) assign("titulo", fields.titulo);
    if (fields.descripcion !== undefined) assign("descripcion", fields.descripcion);
    if (fields.ubicacion !== undefined) assign("ubicacion", fields.ubicacion);
    if (fields.observaciones !== undefined) assign("observaciones", fields.observaciones);
    if (fields.inicio_at !== undefined) assign("inicio_at", fields.inicio_at);
    if (fields.fin_at !== undefined) assign("fin_at", fields.fin_at);
    if (fields.todo_el_dia !== undefined) assign("todo_el_dia", fields.todo_el_dia);
    if (fields.estado !== undefined) assign("estado", fields.estado);
    if (fields.notificar_antes_cantidad !== undefined) {
      assign("notificar_antes_cantidad", fields.notificar_antes_cantidad);
    }
    if (fields.notificar_antes_unidad !== undefined) {
      assign("notificar_antes_unidad", fields.notificar_antes_unidad);
    }

    params.push(id, tenantId);
    await pgQuery(
      `UPDATE agenda_evento SET ${sets.join(", ")}
       WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1} AND deleted_at IS NULL`,
      params,
    );
  },

  async softDelete(ctx: DbContext, id: string, deletedBy: string) {
    const tenantId = requireTenantId(ctx);
    await pgQuery(
      `UPDATE agenda_evento SET deleted_at = $1, deleted_by = $2
       WHERE id = $3 AND tenant_id = $4 AND deleted_at IS NULL`,
      [nowIso(), deletedBy, id, tenantId],
    );
  },

  async assertEntidadExists(
    ctx: DbContext,
    entidadTipo: AgendaEntidadTipo,
    entidadId: string,
  ): Promise<boolean> {
    if (entidadTipo === "tarea" || entidadTipo === "actuacion") {
      return true;
    }

    const tenantId = requireTenantId(ctx);

    if (entidadTipo === "legajo") {
      const row = await queryOne(
        `SELECT l.id
         FROM legajo l
         INNER JOIN caso c ON c.id = l.caso_id
         WHERE l.id = $1 AND c.tenant_id = $2`,
        [entidadId, tenantId],
      );
      return row != null;
    }

    const tableByTipo: Record<
      Exclude<AgendaEntidadTipo, "legajo" | "tarea" | "actuacion">,
      string
    > = {
      expediente: "expediente",
      caso: "caso",
      cliente: "cliente",
    };

    const table = tableByTipo[entidadTipo];
    const row = await queryOne(
      `SELECT id FROM ${table} WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [entidadId, tenantId],
    );
    return row != null;
  },

  async listEntidadesPadre(
    ctx: DbContext,
    entidadTipo: AgendaEntidadPadreFilterTipo,
    q?: string,
  ): Promise<Array<{ id: string; label: string }>> {
    const tenantId = requireTenantId(ctx);
    const search = q?.trim() ? `%${q.trim()}%` : null;
    const limit = 200;

    if (entidadTipo === "caso") {
      const conditions = ["tenant_id = $1", "deleted_at IS NULL"];
      const params: unknown[] = [tenantId];
      if (search) {
        conditions.push("(nombre ILIKE $2 OR numero ILIKE $2)");
        params.push(search);
      }
      return queryRows<{ id: string; label: string }>(
        `SELECT id,
                CASE
                  WHEN NULLIF(TRIM(numero), '') IS NOT NULL
                       AND NULLIF(TRIM(nombre), '') IS NOT NULL
                    THEN TRIM(numero) || ' — ' || TRIM(nombre)
                  WHEN NULLIF(TRIM(numero), '') IS NOT NULL
                    THEN TRIM(numero)
                  WHEN NULLIF(TRIM(nombre), '') IS NOT NULL
                    THEN TRIM(nombre)
                  ELSE 'Caso sin nombre'
                END AS label
         FROM caso
         WHERE ${conditions.join(" AND ")}
         ORDER BY numero NULLS LAST, nombre NULLS LAST
         LIMIT ${limit}`,
        params,
      );
    }

    if (entidadTipo === "cliente") {
      const conditions = ["c.tenant_id = $1", "c.deleted_at IS NULL"];
      const params: unknown[] = [tenantId];
      if (search) {
        conditions.push(
          "(p.nombre ILIKE $2 OR p.apellido ILIKE $2 OR p.documento ILIKE $2)",
        );
        params.push(search);
      }
      return queryRows<{ id: string; label: string }>(
        `SELECT c.id,
                TRIM(CONCAT(COALESCE(p.apellido, ''), ' ', COALESCE(p.nombre, ''))) AS label
         FROM cliente c
         INNER JOIN persona p ON p.id = c.persona_id
         WHERE ${conditions.join(" AND ")}
         ORDER BY p.apellido NULLS LAST, p.nombre NULLS LAST
         LIMIT ${limit}`,
        params,
      );
    }

    if (entidadTipo === "expediente") {
      const conditions = ["e.tenant_id = $1", "e.deleted_at IS NULL"];
      const params: unknown[] = [tenantId];
      if (search) {
        conditions.push("(e.nombre ILIKE $2 OR c.numero ILIKE $2)");
        params.push(search);
      }
      return queryRows<{ id: string; label: string }>(
        `SELECT e.id,
                CASE
                  WHEN NULLIF(TRIM(c.numero), '') IS NOT NULL
                       AND NULLIF(TRIM(e.nombre), '') IS NOT NULL
                    THEN TRIM(c.numero) || ' — ' || TRIM(e.nombre)
                  WHEN NULLIF(TRIM(e.nombre), '') IS NOT NULL
                    THEN TRIM(e.nombre)
                  WHEN NULLIF(TRIM(c.numero), '') IS NOT NULL
                    THEN TRIM(c.numero)
                  ELSE 'Expediente sin nombre'
                END AS label
         FROM expediente e
         LEFT JOIN caso c ON c.id = e.caso_id AND c.deleted_at IS NULL
         WHERE ${conditions.join(" AND ")}
         ORDER BY c.numero NULLS LAST, e.nombre NULLS LAST, e.created_at DESC
         LIMIT ${limit}`,
        params,
      );
    }

    const conditions = ["c.tenant_id = $1"];
    const params: unknown[] = [tenantId];
    if (search) {
      conditions.push("c.nombre ILIKE $2");
      params.push(search);
    }
    return queryRows<{ id: string; label: string }>(
      `SELECT l.id,
              COALESCE(
                NULLIF(TRIM(c.nombre), ''),
                CONCAT('Legajo ', LEFT(l.id::text, 8))
              ) AS label
       FROM legajo l
       INNER JOIN caso c ON c.id = l.caso_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY c.nombre NULLS LAST, l.id
       LIMIT ${limit}`,
      params,
    );
  },

  entidadEtiquetaKey(
    entidadTipo: AgendaEntidadTipo,
    entidadId: string,
  ): string {
    return `${entidadTipo}:${entidadId}`;
  },

  async resolveEntidadEtiquetasBatch(
    ctx: DbContext,
    items: Array<{ entidad_tipo: AgendaEntidadTipo; entidad_id: string }>,
  ): Promise<Map<string, string | null>> {
    const result = new Map<string, string | null>();
    if (items.length === 0) return result;

    const tenantId = requireTenantId(ctx);
    const unique = new Map<
      string,
      { entidad_tipo: AgendaEntidadTipo; entidad_id: string }
    >();

    for (const item of items) {
      const key = this.entidadEtiquetaKey(item.entidad_tipo, item.entidad_id);
      unique.set(key, item);
    }

    const casoIds: string[] = [];
    const expedienteIds: string[] = [];
    const clienteIds: string[] = [];

    for (const item of unique.values()) {
      if (item.entidad_tipo === "caso") casoIds.push(item.entidad_id);
      else if (item.entidad_tipo === "expediente") {
        expedienteIds.push(item.entidad_id);
      } else if (item.entidad_tipo === "cliente") {
        clienteIds.push(item.entidad_id);
      }
    }

    const [casoRows, expedienteRows, clienteRows] = await Promise.all([
      casoIds.length > 0
        ? queryRows<{
            id: string;
            nombre: string | null;
            numero: string | null;
          }>(
            `SELECT id, nombre, numero
             FROM caso
             WHERE tenant_id = $1
               AND deleted_at IS NULL
               AND id = ANY($2::uuid[])`,
            [tenantId, casoIds],
          )
        : Promise.resolve([]),
      expedienteIds.length > 0
        ? queryRows<{ id: string; nombre: string }>(
            `SELECT id, nombre
             FROM expediente
             WHERE tenant_id = $1
               AND deleted_at IS NULL
               AND id = ANY($2::uuid[])`,
            [tenantId, expedienteIds],
          )
        : Promise.resolve([]),
      clienteIds.length > 0
        ? queryRows<{
            id: string;
            nombre: string | null;
            apellido: string | null;
          }>(
            `SELECT c.id, p.nombre, p.apellido
             FROM cliente c
             INNER JOIN persona p ON p.id = c.persona_id AND p.deleted_at IS NULL
             WHERE c.tenant_id = $1
               AND c.deleted_at IS NULL
               AND c.id = ANY($2::uuid[])`,
            [tenantId, clienteIds],
          )
        : Promise.resolve([]),
    ]);

    for (const row of casoRows) {
      const nombre = row.nombre?.trim() || null;
      const numero = row.numero?.trim() || null;
      const etiqueta =
        nombre && numero ? `${nombre} - ${numero}` : nombre ?? numero;
      result.set(this.entidadEtiquetaKey("caso", row.id), etiqueta);
    }

    for (const row of expedienteRows) {
      result.set(
        this.entidadEtiquetaKey("expediente", row.id),
        row.nombre ?? null,
      );
    }

    for (const row of clienteRows) {
      const etiqueta =
        [row.nombre, row.apellido].filter(Boolean).join(" ").trim() || null;
      result.set(this.entidadEtiquetaKey("cliente", row.id), etiqueta);
    }

    for (const [key, item] of unique) {
      if (result.has(key)) continue;
      if (
        item.entidad_tipo === "caso" ||
        item.entidad_tipo === "expediente" ||
        item.entidad_tipo === "cliente"
      ) {
        result.set(key, null);
      }
    }

    return result;
  },

  async resolveEntidadEtiqueta(
    ctx: DbContext,
    entidadTipo: AgendaEntidadTipo,
    entidadId: string,
  ): Promise<string | null> {
    const map = await this.resolveEntidadEtiquetasBatch(ctx, [
      { entidad_tipo: entidadTipo, entidad_id: entidadId },
    ]);
    return map.get(this.entidadEtiquetaKey(entidadTipo, entidadId)) ?? null;
  },
};
