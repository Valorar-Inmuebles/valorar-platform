import type { DbContext } from "@/BBDD/base/types";
import { requireTenantId } from "@/BBDD/base/BaseRepository";
import { ilikePattern, nowIso } from "@/BBDD/base/helpers";
import { queryCount, queryOne, queryRows } from "@/BBDD/base/query";
import sql from "@/BBDD/base/db";
import { NotFoundError } from "@/lib/server/not-found-error";
import { logPostgresError, rethrowDbError } from "@/BBDD/base/errors";
import type {
  WorkflowEstado,
  WorkflowEtapaColor,
  WorkflowListFilters,
} from "@/lib/types/workflow";

export type WorkflowRow = {
  id: string;
  tenant_id: string | null;
  workflow_tipo_id: string | null;
  workflow_rol_id: string | null;
  jurisdiccion_id: string | null;
  fuero_id: string | null;
  objeto_id: string | null;
  origen: string;
  estado: string;
  nombre: string;
  descripcion: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  published_by: string | null;
  published_at: string | null;
  archived_by: string | null;
  archived_at: string | null;
  cloned_from_workflow_id: string | null;
};

export type WorkflowListQueryRow = {
  id: string;
  origen: string;
  estado: string;
  nombre: string;
  descripcion: string | null;
  workflow_tipo_id: string | null;
  workflow_rol_id: string | null;
  jurisdiccion_id: string | null;
  fuero_id: string | null;
  objeto_id: string | null;
  created_at: string;
  updated_at: string;
  tipo: { nombre: string } | null;
  rol: { nombre: string } | null;
  jurisdiccion: { nombre: string | null } | null;
  fuero: { nombre: string | null } | null;
  objeto: { nombre: string | null } | null;
  etapas_count: number;
  partes_count: number;
  tareas_count: number;
};

export type WorkflowEtapaRow = {
  id: string;
  workflow_id: string;
  nombre: string;
  descripcion: string | null;
  color: string;
  orden: number;
  es_inicial: boolean;
  es_final: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkflowParteRow = {
  id: string;
  workflow_id: string;
  nombre: string;
  es_principal: boolean;
  obligatoria: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowCampoDinamicoRow = {
  id: string;
  workflow_id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  regex: string | null;
  minimo: string | null;
  maximo: string | null;
  longitud_maxima: number | null;
  requerido: boolean;
  placeholder: string | null;
  ayuda: string | null;
  valor_default: string | null;
  visible_tabla: boolean;
  ancho_grilla: number;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowCampoOpcionRow = {
  id: string;
  workflow_campo_dinamico_id: string;
  valor: string;
  etiqueta: string;
  orden: number;
  created_at: string;
};

export type WorkflowCampoDinamicoSnapshot = {
  clave: string;
  etiqueta: string;
  tipo: string;
  regex: string | null;
  minimo: string | null;
  maximo: string | null;
  longitud_maxima: number | null;
  requerido: boolean;
  placeholder: string | null;
  ayuda: string | null;
  valor_default: string | null;
  visible_tabla: boolean;
  ancho_grilla: number;
  opciones: Array<{ valor: string; etiqueta: string; orden: number }>;
};

export type WorkflowCampoDinamicoWithOpciones = WorkflowCampoDinamicoRow & {
  opciones: WorkflowCampoOpcionRow[];
};

export type WorkflowParteCampoOpcionRow = {
  id: string;
  workflow_parte_campo_dinamico_id: string;
  valor: string;
  etiqueta: string;
  orden: number;
  created_at: string;
};

export type WorkflowParteCampoDinamicoRow = {
  id: string;
  workflow_parte_id: string;
  clave: string;
  etiqueta: string;
  tipo: string;
  regex: string | null;
  minimo: string | null;
  maximo: string | null;
  longitud_maxima: number | null;
  requerido: boolean;
  placeholder: string | null;
  ayuda: string | null;
  valor_default: string | null;
  visible_tabla: boolean;
  ancho_grilla: number;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowParteCampoDinamicoSnapshot = {
  clave: string;
  etiqueta: string;
  tipo: string;
  regex: string | null;
  minimo: string | null;
  maximo: string | null;
  longitud_maxima: number | null;
  requerido: boolean;
  placeholder: string | null;
  ayuda: string | null;
  valor_default: string | null;
  visible_tabla: boolean;
  ancho_grilla: number;
  opciones: Array<{ valor: string; etiqueta: string; orden: number }>;
};

export type WorkflowParteCampoDinamicoWithOpciones =
  WorkflowParteCampoDinamicoRow & {
    opciones: WorkflowParteCampoOpcionRow[];
  };

export type WorkflowTareaRow = {
  id: string;
  workflow_etapa_id: string;
  titulo: string;
  descripcion: string | null;
  obligatoria: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowDetailGraph = WorkflowRow & {
  etapas: Array<
    WorkflowEtapaRow & {
      tareas: WorkflowTareaRow[];
    }
  >;
  partes: Array<
    WorkflowParteRow & {
      campos_dinamicos: Array<
        WorkflowParteCampoDinamicoRow & {
          opciones: WorkflowParteCampoOpcionRow[];
        }
      >;
    }
  >;
  campos_dinamicos: Array<
    WorkflowCampoDinamicoRow & {
      opciones: WorkflowCampoOpcionRow[];
    }
  >;
};

const WORKFLOW_FIELDS = `
  id, tenant_id, workflow_tipo_id, workflow_rol_id,
  jurisdiccion_id, fuero_id, objeto_id,
  origen, estado, nombre, descripcion,
  created_by, created_at, updated_by, updated_at,
  published_by, published_at, archived_by, archived_at,
  cloned_from_workflow_id
`;

function buildAccessClause(alias: string, tenantId: string, paramIndex: number) {
  return {
    clause: `(
      ${alias}.origen = 'system'
      OR (${alias}.origen = 'tenant' AND ${alias}.tenant_id = $${paramIndex})
    )`,
    params: [tenantId],
    nextParamIndex: paramIndex + 1,
  };
}

type SqlExecutor = Pick<typeof sql, "unsafe">;

const CLEAR_ETAPA_BOUNDARY_FLAGS_SQL = `
  UPDATE workflow_etapa
  SET
    es_inicial = false,
    es_final = false,
    updated_at = now()
  WHERE workflow_id = $1
`;

const SET_ETAPA_BOUNDARY_FLAGS_SQL = `
  WITH stats AS (
    SELECT
      workflow_id,
      COUNT(*)::int AS cnt,
      MIN(orden) AS min_ord,
      MAX(orden) AS max_ord
    FROM workflow_etapa
    WHERE workflow_id = $1
    GROUP BY workflow_id
  )
  UPDATE workflow_etapa e
  SET
    es_inicial = (
      s.cnt = 1
      OR (s.cnt > 1 AND e.orden = s.min_ord)
    ),
    es_final = (
      s.cnt = 1
      OR (s.cnt > 1 AND e.orden = s.max_ord)
    ),
    updated_at = now()
  FROM stats s
  WHERE e.workflow_id = s.workflow_id
`;

async function syncEtapaBoundaryFlags(
  executor: SqlExecutor,
  workflowId: string,
): Promise<void> {
  await executor.unsafe(CLEAR_ETAPA_BOUNDARY_FLAGS_SQL, [workflowId]);
  await executor.unsafe(SET_ETAPA_BOUNDARY_FLAGS_SQL, [workflowId]);
}

export const workflowRepository = {
  async list(
    ctx: DbContext,
    filters: WorkflowListFilters = {},
  ): Promise<WorkflowListQueryRow[]> {
    const tenantId = requireTenantId(ctx);
    const conditions: string[] = [];
    const params: unknown[] = [tenantId];
    let paramIndex = 2;

    const access = buildAccessClause("w", tenantId, 1);
    conditions.push(access.clause);

    if (filters.origen) {
      conditions.push(`w.origen = $${paramIndex}`);
      params.push(filters.origen);
      paramIndex += 1;
    }

    if (filters.estado) {
      conditions.push(`w.estado = $${paramIndex}`);
      params.push(filters.estado);
      paramIndex += 1;
    }

    if (filters.workflow_tipo_id) {
      conditions.push(`w.workflow_tipo_id = $${paramIndex}`);
      params.push(filters.workflow_tipo_id);
      paramIndex += 1;
    }

    if (filters.q?.trim()) {
      conditions.push(`w.nombre ILIKE $${paramIndex}`);
      params.push(ilikePattern(filters.q.trim()));
      paramIndex += 1;
    }

    return queryRows<WorkflowListQueryRow>(
      `SELECT
         w.id, w.origen, w.estado, w.nombre, w.descripcion,
         w.workflow_tipo_id, w.workflow_rol_id,
         w.jurisdiccion_id, w.fuero_id, w.objeto_id,
         w.created_at, w.updated_at,
         json_build_object('nombre', wt.nombre) AS tipo,
         json_build_object('nombre', wr.nombre) AS rol,
         json_build_object('nombre', j.nombre) AS jurisdiccion,
         json_build_object('nombre', f.nombre) AS fuero,
         json_build_object('nombre', o.nombre) AS objeto,
         (SELECT COUNT(*)::int FROM workflow_etapa e WHERE e.workflow_id = w.id) AS etapas_count,
         (SELECT COUNT(*)::int FROM workflow_parte p WHERE p.workflow_id = w.id) AS partes_count,
         (
           SELECT COUNT(*)::int
           FROM workflow_tarea t
           INNER JOIN workflow_etapa e ON e.id = t.workflow_etapa_id
           WHERE e.workflow_id = w.id
         ) AS tareas_count
       FROM workflow w
       LEFT JOIN workflow_tipo wt ON wt.id = w.workflow_tipo_id
       LEFT JOIN workflow_rol wr ON wr.id = w.workflow_rol_id
       LEFT JOIN jurisdiccion j ON j.id = w.jurisdiccion_id
       LEFT JOIN fuero f ON f.id = w.fuero_id
       LEFT JOIN objeto o ON o.id = w.objeto_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY
         CASE WHEN w.origen = 'system' THEN 0 ELSE 1 END,
         w.updated_at DESC,
         w.nombre ASC`,
      params,
    );
  },

  async getById(ctx: DbContext, id: string): Promise<WorkflowRow> {
    const tenantId = requireTenantId(ctx);
    const access = buildAccessClause("w", tenantId, 2);
    const row = await queryOne<WorkflowRow>(
      `SELECT ${WORKFLOW_FIELDS}
       FROM workflow w
       WHERE w.id = $1 AND ${access.clause}`,
      [id, ...access.params],
    );
    if (!row) throw new NotFoundError("Workflow no encontrado");
    return row;
  },

  async getDetailGraph(ctx: DbContext, id: string): Promise<WorkflowDetailGraph> {
    const workflow = await this.getById(ctx, id);

    const etapas = await queryRows<
      WorkflowEtapaRow & { tareas: WorkflowTareaRow[] | null }
    >(
      `SELECT
         e.id, e.workflow_id, e.nombre, e.descripcion, e.color, e.orden,
         e.es_inicial, e.es_final, e.created_at, e.updated_at,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', t.id,
                 'workflow_etapa_id', t.workflow_etapa_id,
                 'titulo', t.titulo,
                 'descripcion', t.descripcion,
                 'obligatoria', t.obligatoria,
                 'orden', t.orden,
                 'created_at', t.created_at,
                 'updated_at', t.updated_at
               )
               ORDER BY t.orden
             )
             FROM workflow_tarea t
             WHERE t.workflow_etapa_id = e.id
           ),
           '[]'::json
         ) AS tareas
       FROM workflow_etapa e
       WHERE e.workflow_id = $1
       ORDER BY e.orden ASC`,
      [id],
    );

    const partes = await queryRows<
      WorkflowParteRow & {
        campos_dinamicos:
          | Array<
              WorkflowParteCampoDinamicoRow & {
                opciones: WorkflowParteCampoOpcionRow[] | null;
              }
            >
          | null;
      }
    >(
      `SELECT
         p.id, p.workflow_id, p.nombre, p.es_principal, p.obligatoria, p.orden,
         p.created_at, p.updated_at,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', c.id,
                 'workflow_parte_id', c.workflow_parte_id,
                 'clave', c.clave,
                 'etiqueta', c.etiqueta,
                 'tipo', c.tipo,
                 'regex', c.regex,
                 'minimo', c.minimo,
                 'maximo', c.maximo,
                 'longitud_maxima', c.longitud_maxima,
                 'requerido', c.requerido,
                 'placeholder', c.placeholder,
                 'ayuda', c.ayuda,
                 'valor_default', c.valor_default,
                 'visible_tabla', c.visible_tabla,
                 'ancho_grilla', c.ancho_grilla,
                 'orden', c.orden,
                 'created_at', c.created_at,
                 'updated_at', c.updated_at,
                 'opciones', COALESCE(
                   (
                     SELECT json_agg(
                       json_build_object(
                         'id', o.id,
                         'workflow_parte_campo_dinamico_id', o.workflow_parte_campo_dinamico_id,
                         'valor', o.valor,
                         'etiqueta', o.etiqueta,
                         'orden', o.orden,
                         'created_at', o.created_at
                       )
                       ORDER BY o.orden
                     )
                     FROM workflow_parte_campo_opcion o
                     WHERE o.workflow_parte_campo_dinamico_id = c.id
                   ),
                   '[]'::json
                 )
               )
               ORDER BY c.orden
             )
             FROM workflow_parte_campo_dinamico c
             WHERE c.workflow_parte_id = p.id
           ),
           '[]'::json
         ) AS campos_dinamicos
       FROM workflow_parte p
       WHERE p.workflow_id = $1
       ORDER BY p.orden ASC`,
      [id],
    );

    const campos = await queryRows<
      WorkflowCampoDinamicoRow & { opciones: WorkflowCampoOpcionRow[] | null }
    >(
      `SELECT
         c.id, c.workflow_id, c.clave, c.etiqueta, c.tipo, c.regex,
         c.minimo, c.maximo, c.longitud_maxima, c.requerido, c.placeholder,
         c.ayuda, c.valor_default, c.visible_tabla, c.ancho_grilla, c.orden,
         c.created_at, c.updated_at,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', o.id,
                 'workflow_campo_dinamico_id', o.workflow_campo_dinamico_id,
                 'valor', o.valor,
                 'etiqueta', o.etiqueta,
                 'orden', o.orden,
                 'created_at', o.created_at
               )
               ORDER BY o.orden
             )
             FROM workflow_campo_opcion o
             WHERE o.workflow_campo_dinamico_id = c.id
           ),
           '[]'::json
         ) AS opciones
       FROM workflow_campo_dinamico c
       WHERE c.workflow_id = $1
       ORDER BY c.orden ASC`,
      [id],
    );

    return {
      ...workflow,
      etapas: etapas.map((etapa) => ({
        ...etapa,
        tareas: etapa.tareas ?? [],
      })),
      partes: partes.map((parte) => ({
        ...parte,
        campos_dinamicos: (parte.campos_dinamicos ?? []).map((campo) => ({
          ...campo,
          opciones: campo.opciones ?? [],
        })),
      })),
      campos_dinamicos: campos.map((campo) => ({
        ...campo,
        opciones: campo.opciones ?? [],
      })),
    };
  },

  async create(
    ctx: DbContext,
    payload: {
      workflow_tipo_id: string;
      workflow_rol_id: string;
      jurisdiccion_id: string;
      fuero_id: string;
      objeto_id: string;
      nombre: string;
      descripcion?: string | null;
      created_by: string;
      cloned_from_workflow_id?: string | null;
    },
  ): Promise<WorkflowRow> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<WorkflowRow>(
      `INSERT INTO workflow (
         tenant_id, workflow_tipo_id, workflow_rol_id,
         jurisdiccion_id, fuero_id, objeto_id,
         origen, estado, nombre, descripcion,
         created_by, updated_by, cloned_from_workflow_id
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         'tenant', 'borrador', $7, $8,
         $9, $9, $10
       )
       RETURNING ${WORKFLOW_FIELDS}`,
      [
        tenantId,
        payload.workflow_tipo_id,
        payload.workflow_rol_id,
        payload.jurisdiccion_id,
        payload.fuero_id,
        payload.objeto_id,
        payload.nombre,
        payload.descripcion ?? null,
        payload.created_by,
        payload.cloned_from_workflow_id ?? null,
      ],
    );
    if (!row) throw new Error("Error al crear workflow");
    return row;
  },

  async createDraft(
    ctx: DbContext,
    payload: {
      nombre: string;
      descripcion?: string | null;
      created_by: string;
    },
  ): Promise<WorkflowRow> {
    const tenantId = requireTenantId(ctx);
    const row = await queryOne<WorkflowRow>(
      `INSERT INTO workflow (
         tenant_id, workflow_tipo_id, workflow_rol_id,
         jurisdiccion_id, fuero_id, objeto_id,
         origen, estado, nombre, descripcion,
         created_by, updated_by
       ) VALUES (
         $1, NULL, NULL, NULL, NULL, NULL,
         'tenant', 'borrador', $2, $3,
         $4, $4
       )
       RETURNING ${WORKFLOW_FIELDS}`,
      [
        tenantId,
        payload.nombre,
        payload.descripcion ?? null,
        payload.created_by,
      ],
    );
    if (!row) throw new Error("Error al crear borrador de workflow");
    return row;
  },

  async update(
    ctx: DbContext,
    id: string,
    payload: {
      workflow_tipo_id?: string;
      workflow_rol_id?: string;
      jurisdiccion_id?: string;
      fuero_id?: string;
      objeto_id?: string;
      nombre?: string;
      descripcion?: string | null;
      updated_by: string;
    },
  ): Promise<void> {
    const tenantId = requireTenantId(ctx);
    const sets: string[] = ["updated_by = $1", "updated_at = $2"];
    const params: unknown[] = [payload.updated_by, nowIso()];
    let paramIndex = 3;

    const assign = (column: string, value: unknown) => {
      sets.push(`${column} = $${paramIndex}`);
      params.push(value);
      paramIndex += 1;
    };

    if (payload.workflow_tipo_id !== undefined) {
      assign("workflow_tipo_id", payload.workflow_tipo_id);
    }
    if (payload.workflow_rol_id !== undefined) {
      assign("workflow_rol_id", payload.workflow_rol_id);
    }
    if (payload.jurisdiccion_id !== undefined) {
      assign("jurisdiccion_id", payload.jurisdiccion_id);
    }
    if (payload.fuero_id !== undefined) {
      assign("fuero_id", payload.fuero_id);
    }
    if (payload.objeto_id !== undefined) {
      assign("objeto_id", payload.objeto_id);
    }
    if (payload.nombre !== undefined) {
      assign("nombre", payload.nombre);
    }
    if (payload.descripcion !== undefined) {
      assign("descripcion", payload.descripcion);
    }

    if (sets.length === 2) {
      throw new NotFoundError("Workflow no encontrado");
    }

    params.push(id, tenantId);
    const rows = await queryRows<{ id: string }>(
      `UPDATE workflow
       SET ${sets.join(", ")}
       WHERE id = $${paramIndex}
         AND tenant_id = $${paramIndex + 1}
         AND origen = 'tenant'
       RETURNING id`,
      params,
    );

    if (!rows.length) throw new NotFoundError("Workflow no encontrado");
  },

  async setEstado(
    ctx: DbContext,
    id: string,
    payload: {
      estado: WorkflowEstado;
      updated_by: string;
      published_by?: string | null;
      published_at?: string | null;
      archived_by?: string | null;
      archived_at?: string | null;
    },
  ): Promise<void> {
    const tenantId = requireTenantId(ctx);
    const sets = ["estado = $1", "updated_by = $2", "updated_at = $3"];
    const params: unknown[] = [payload.estado, payload.updated_by, nowIso()];
    let paramIndex = 4;

    if (payload.published_by !== undefined) {
      sets.push(`published_by = $${paramIndex}`);
      params.push(payload.published_by);
      paramIndex += 1;
    }
    if (payload.published_at !== undefined) {
      sets.push(`published_at = $${paramIndex}`);
      params.push(payload.published_at);
      paramIndex += 1;
    }
    if (payload.archived_by !== undefined) {
      sets.push(`archived_by = $${paramIndex}`);
      params.push(payload.archived_by);
      paramIndex += 1;
    }
    if (payload.archived_at !== undefined) {
      sets.push(`archived_at = $${paramIndex}`);
      params.push(payload.archived_at);
      paramIndex += 1;
    }

    params.push(id, tenantId);
    const rows = await queryRows<{ id: string }>(
      `UPDATE workflow
       SET ${sets.join(", ")}
       WHERE id = $${paramIndex}
         AND tenant_id = $${paramIndex + 1}
         AND origen = 'tenant'
       RETURNING id`,
      params,
    );

    if (!rows.length) throw new NotFoundError("Workflow no encontrado");
  },

  async cloneDeep(
    ctx: DbContext,
    sourceWorkflowId: string,
    payload: {
      nombre: string;
      created_by: string;
    },
  ): Promise<string> {
    const tenantId = requireTenantId(ctx);

    return sql.begin(async (tx) => {
      const sourceRows = await tx.unsafe<WorkflowRow[]>(
        `SELECT ${WORKFLOW_FIELDS}
         FROM workflow w
         WHERE w.id = $1
           AND (
             w.origen = 'system'
             OR (w.origen = 'tenant' AND w.tenant_id = $2)
           )`,
        [sourceWorkflowId, tenantId],
      );
      const source = sourceRows[0];
      if (!source) throw new NotFoundError("Workflow no encontrado");

      const etapas = await tx.unsafe<WorkflowEtapaRow[]>(
        `SELECT id, workflow_id, nombre, descripcion, color, orden,
                created_at, updated_at
         FROM workflow_etapa
         WHERE workflow_id = $1
         ORDER BY orden ASC`,
        [source.id],
      );

      const partes = await tx.unsafe<WorkflowParteRow[]>(
        `SELECT id, workflow_id, nombre, es_principal, obligatoria, orden,
                created_at, updated_at
         FROM workflow_parte
         WHERE workflow_id = $1
         ORDER BY orden ASC`,
        [source.id],
      );

      const campos = await tx.unsafe<WorkflowCampoDinamicoRow[]>(
        `SELECT id, workflow_id, clave, etiqueta, tipo, regex,
                minimo, maximo, longitud_maxima, requerido, placeholder,
                ayuda, valor_default, visible_tabla, ancho_grilla, orden,
                created_at, updated_at
         FROM workflow_campo_dinamico
         WHERE workflow_id = $1
         ORDER BY orden ASC`,
        [source.id],
      );

      const allTareas = await tx.unsafe<WorkflowTareaRow[]>(
        `SELECT t.id, t.workflow_etapa_id, t.titulo, t.descripcion, t.obligatoria,
                t.orden, t.created_at, t.updated_at
         FROM workflow_tarea t
         INNER JOIN workflow_etapa e ON e.id = t.workflow_etapa_id
         WHERE e.workflow_id = $1
         ORDER BY t.workflow_etapa_id, t.orden ASC`,
        [source.id],
      );

      const tareasByEtapa = new Map<string, WorkflowTareaRow[]>();
      for (const tarea of allTareas) {
        const list = tareasByEtapa.get(tarea.workflow_etapa_id) ?? [];
        list.push(tarea);
        tareasByEtapa.set(tarea.workflow_etapa_id, list);
      }

      const allOpciones = await tx.unsafe<WorkflowCampoOpcionRow[]>(
        `SELECT o.id, o.workflow_campo_dinamico_id, o.valor, o.etiqueta,
                o.orden, o.created_at
         FROM workflow_campo_opcion o
         INNER JOIN workflow_campo_dinamico c ON c.id = o.workflow_campo_dinamico_id
         WHERE c.workflow_id = $1
         ORDER BY o.workflow_campo_dinamico_id, o.orden ASC`,
        [source.id],
      );

      const allParteCampos = await tx.unsafe<WorkflowParteCampoDinamicoRow[]>(
        `SELECT c.id, c.workflow_parte_id, c.clave, c.etiqueta, c.tipo, c.regex,
                c.minimo, c.maximo, c.longitud_maxima, c.requerido, c.placeholder,
                c.ayuda, c.valor_default, c.visible_tabla, c.ancho_grilla, c.orden,
                c.created_at, c.updated_at
         FROM workflow_parte_campo_dinamico c
         INNER JOIN workflow_parte p ON p.id = c.workflow_parte_id
         WHERE p.workflow_id = $1
         ORDER BY c.workflow_parte_id, c.orden ASC`,
        [source.id],
      );

      const allParteOpciones = await tx.unsafe<WorkflowParteCampoOpcionRow[]>(
        `SELECT o.id, o.workflow_parte_campo_dinamico_id, o.valor, o.etiqueta,
                o.orden, o.created_at
         FROM workflow_parte_campo_opcion o
         INNER JOIN workflow_parte_campo_dinamico c ON c.id = o.workflow_parte_campo_dinamico_id
         INNER JOIN workflow_parte p ON p.id = c.workflow_parte_id
         WHERE p.workflow_id = $1
         ORDER BY o.workflow_parte_campo_dinamico_id, o.orden ASC`,
        [source.id],
      );

      const opcionesByCampo = new Map<string, WorkflowCampoOpcionRow[]>();
      for (const opcion of allOpciones) {
        const list = opcionesByCampo.get(opcion.workflow_campo_dinamico_id) ?? [];
        list.push(opcion);
        opcionesByCampo.set(opcion.workflow_campo_dinamico_id, list);
      }

      const parteCamposByParte = new Map<string, WorkflowParteCampoDinamicoRow[]>();
      for (const campo of allParteCampos) {
        const list = parteCamposByParte.get(campo.workflow_parte_id) ?? [];
        list.push(campo);
        parteCamposByParte.set(campo.workflow_parte_id, list);
      }

      const parteOpcionesByCampo = new Map<string, WorkflowParteCampoOpcionRow[]>();
      for (const opcion of allParteOpciones) {
        const list =
          parteOpcionesByCampo.get(opcion.workflow_parte_campo_dinamico_id) ?? [];
        list.push(opcion);
        parteOpcionesByCampo.set(opcion.workflow_parte_campo_dinamico_id, list);
      }

      const created = await tx.unsafe<{ id: string }[]>(
        `INSERT INTO workflow (
           tenant_id, workflow_tipo_id, workflow_rol_id,
           jurisdiccion_id, fuero_id, objeto_id,
           origen, estado, nombre, descripcion,
           created_by, updated_by, cloned_from_workflow_id
         ) VALUES ($1, $2, $3, $4, $5, $6, 'tenant', 'borrador', $7, $8, $9, $9, $10)
         RETURNING id`,
        [
          tenantId,
          source.workflow_tipo_id,
          source.workflow_rol_id,
          source.jurisdiccion_id,
          source.fuero_id,
          source.objeto_id,
          payload.nombre,
          source.descripcion,
          payload.created_by,
          source.id,
        ],
      );

      const newWorkflowId = created[0]?.id;
      if (!newWorkflowId) throw new Error("Error al clonar workflow");

      const etapaIdMap = new Map<string, string>();

      for (const etapa of etapas) {
        const inserted = await tx.unsafe<{ id: string }[]>(
          `INSERT INTO workflow_etapa (
             workflow_id, nombre, descripcion, color, orden
           ) VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            newWorkflowId,
            etapa.nombre,
            etapa.descripcion,
            etapa.color,
            etapa.orden,
          ],
        );
        const newEtapaId = inserted[0]?.id;
        if (!newEtapaId) throw new Error("Error al clonar etapas");
        etapaIdMap.set(etapa.id, newEtapaId);
      }

      await syncEtapaBoundaryFlags(tx, newWorkflowId);

      const parteIdMap = new Map<string, string>();

      for (const parte of partes) {
        const inserted = await tx.unsafe<{ id: string }[]>(
          `INSERT INTO workflow_parte (
             workflow_id, nombre, es_principal, obligatoria, orden
           ) VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [
            newWorkflowId,
            parte.nombre,
            parte.es_principal,
            parte.obligatoria,
            parte.orden,
          ],
        );
        const newParteId = inserted[0]?.id;
        if (!newParteId) throw new Error("Error al clonar partes");
        parteIdMap.set(parte.id, newParteId);
      }

      for (const [oldParteId, newParteId] of parteIdMap) {
        for (const campo of parteCamposByParte.get(oldParteId) ?? []) {
          const inserted = await tx.unsafe<{ id: string }[]>(
            `INSERT INTO workflow_parte_campo_dinamico (
               workflow_parte_id, clave, etiqueta, tipo, regex,
               minimo, maximo, longitud_maxima, requerido, placeholder,
               ayuda, valor_default, visible_tabla, ancho_grilla, orden
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING id`,
            [
              newParteId,
              campo.clave,
              campo.etiqueta,
              campo.tipo,
              campo.regex,
              campo.minimo,
              campo.maximo,
              campo.longitud_maxima,
              campo.requerido,
              campo.placeholder,
              campo.ayuda,
              campo.valor_default,
              campo.visible_tabla,
              campo.ancho_grilla,
              campo.orden,
            ],
          );
          const newCampoId = inserted[0]?.id;
          if (!newCampoId) {
            throw new Error("Error al clonar campos dinámicos de parte");
          }

          for (const opcion of parteOpcionesByCampo.get(campo.id) ?? []) {
            await tx.unsafe(
              `INSERT INTO workflow_parte_campo_opcion (
                 workflow_parte_campo_dinamico_id, valor, etiqueta, orden
               ) VALUES ($1, $2, $3, $4)`,
              [newCampoId, opcion.valor, opcion.etiqueta, opcion.orden],
            );
          }
        }
      }

      for (const campo of campos) {
        const inserted = await tx.unsafe<{ id: string }[]>(
          `INSERT INTO workflow_campo_dinamico (
             workflow_id, clave, etiqueta, tipo, regex,
             minimo, maximo, longitud_maxima, requerido, placeholder,
             ayuda, valor_default, visible_tabla, ancho_grilla, orden
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING id`,
          [
            newWorkflowId,
            campo.clave,
            campo.etiqueta,
            campo.tipo,
            campo.regex,
            campo.minimo,
            campo.maximo,
            campo.longitud_maxima,
            campo.requerido,
            campo.placeholder,
            campo.ayuda,
            campo.valor_default,
            campo.visible_tabla,
            campo.ancho_grilla,
            campo.orden,
          ],
        );
        const newCampoId = inserted[0]?.id;
        if (!newCampoId) throw new Error("Error al clonar campos dinámicos");

        for (const opcion of opcionesByCampo.get(campo.id) ?? []) {
          await tx.unsafe(
            `INSERT INTO workflow_campo_opcion (
               workflow_campo_dinamico_id, valor, etiqueta, orden
             ) VALUES ($1, $2, $3, $4)`,
            [newCampoId, opcion.valor, opcion.etiqueta, opcion.orden],
          );
        }
      }

      for (const [oldEtapaId, newEtapaId] of etapaIdMap) {
        for (const tarea of tareasByEtapa.get(oldEtapaId) ?? []) {
          await tx.unsafe(
            `INSERT INTO workflow_tarea (
               workflow_etapa_id, titulo, descripcion, obligatoria, orden
             ) VALUES ($1, $2, $3, $4, $5)`,
            [
              newEtapaId,
              tarea.titulo,
              tarea.descripcion,
              tarea.obligatoria,
              tarea.orden,
            ],
          );
        }
      }

      return newWorkflowId;
    });
  },

  async countEtapas(_ctx: DbContext, workflowId: string): Promise<number> {
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM workflow_etapa
       WHERE workflow_id = $1`,
      [workflowId],
    );
  },

  async getEtapaById(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
  ): Promise<WorkflowEtapaRow> {
    const row = await queryOne<WorkflowEtapaRow>(
      `SELECT
         id, workflow_id, nombre, descripcion, color, orden,
         es_inicial, es_final, created_at, updated_at
       FROM workflow_etapa
       WHERE id = $1
         AND workflow_id = $2`,
      [etapaId, workflowId],
    );
    if (!row) throw new NotFoundError("Etapa no encontrada");
    return row;
  },

  async findEtapaByNombre(
    _ctx: DbContext,
    workflowId: string,
    nombre: string,
    excludeId?: string,
  ): Promise<WorkflowEtapaRow | null> {
    const params: unknown[] = [workflowId, nombre.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowEtapaRow>(
      `SELECT
         id, workflow_id, nombre, descripcion, color, orden,
         es_inicial, es_final, created_at, updated_at
       FROM workflow_etapa
       WHERE workflow_id = $1
         AND lower(nombre) = lower($2)${excludeClause}`,
      params,
    );
  },

  async listEtapaIds(_ctx: DbContext, workflowId: string): Promise<string[]> {
    const rows = await queryRows<{ id: string }>(
      `SELECT id
       FROM workflow_etapa
       WHERE workflow_id = $1
       ORDER BY orden ASC, created_at ASC, id ASC`,
      [workflowId],
    );
    return rows.map((row) => row.id);
  },

  async createEtapa(
    _ctx: DbContext,
    workflowId: string,
    payload: {
      nombre: string;
      descripcion?: string | null;
      color: WorkflowEtapaColor;
    },
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_etapa
           WHERE workflow_id = $1`,
          [workflowId],
        );
        const nextOrden = nextRows[0]?.next_orden ?? 1;

        await tx.unsafe(
          `INSERT INTO workflow_etapa (
             workflow_id, nombre, descripcion, color, orden
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            workflowId,
            payload.nombre.trim(),
            payload.descripcion ?? null,
            payload.color,
            nextOrden,
          ],
        );

        await syncEtapaBoundaryFlags(tx, workflowId);
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async updateEtapa(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
    payload: {
      nombre?: string;
      descripcion?: string | null;
      color?: WorkflowEtapaColor;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (payload.nombre !== undefined) {
      sets.push(`nombre = $${paramIndex}`);
      params.push(payload.nombre.trim());
      paramIndex += 1;
    }
    if (payload.descripcion !== undefined) {
      sets.push(`descripcion = $${paramIndex}`);
      params.push(payload.descripcion);
      paramIndex += 1;
    }
    if (payload.color !== undefined) {
      sets.push(`color = $${paramIndex}`);
      params.push(payload.color);
      paramIndex += 1;
    }

    if (!sets.length) return;

    sets.push("updated_at = now()");
    params.push(etapaId, workflowId);

    try {
      const rows = await queryRows<{ id: string }>(
        `UPDATE workflow_etapa
         SET ${sets.join(", ")}
         WHERE id = $${paramIndex}
           AND workflow_id = $${paramIndex + 1}
         RETURNING id`,
        params,
      );

      if (!rows.length) throw new NotFoundError("Etapa no encontrada");
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async deleteEtapa(_ctx: DbContext, workflowId: string, etapaId: string): Promise<void> {
    await sql.begin(async (tx) => {
      const deleted = await tx.unsafe<{ id: string }[]>(
        `DELETE FROM workflow_etapa
         WHERE id = $1
           AND workflow_id = $2
         RETURNING id`,
        [etapaId, workflowId],
      );

      if (!deleted.length) throw new NotFoundError("Etapa no encontrada");

      await tx.unsafe(
        `WITH ranked AS (
           SELECT
             id,
             ROW_NUMBER() OVER (
               ORDER BY orden ASC, created_at ASC, id ASC
             ) AS new_orden
           FROM workflow_etapa
           WHERE workflow_id = $1
         )
         UPDATE workflow_etapa e
         SET
           orden = r.new_orden,
           updated_at = now()
         FROM ranked r
         WHERE e.id = r.id
           AND e.orden IS DISTINCT FROM r.new_orden`,
        [workflowId],
      );

      await syncEtapaBoundaryFlags(tx, workflowId);
    });
  },

  async reorderEtapas(
    _ctx: DbContext,
    workflowId: string,
    etapaIds: string[],
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const existing = await tx.unsafe<{ id: string }[]>(
          `SELECT id
           FROM workflow_etapa
           WHERE workflow_id = $1
           ORDER BY orden ASC, created_at ASC, id ASC`,
          [workflowId],
        );

        if (existing.length !== etapaIds.length) {
          throw new NotFoundError("Etapa no encontrada");
        }

        const existingIds = new Set(existing.map((row) => row.id));
        for (const etapaId of etapaIds) {
          if (!existingIds.has(etapaId)) {
            throw new NotFoundError("Etapa no encontrada");
          }
        }

        for (let index = 0; index < etapaIds.length; index += 1) {
          await tx.unsafe(
            `UPDATE workflow_etapa
             SET orden = $1, updated_at = now()
             WHERE id = $2
               AND workflow_id = $3`,
            [10000 + index + 1, etapaIds[index], workflowId],
          );
        }

        for (let index = 0; index < etapaIds.length; index += 1) {
          await tx.unsafe(
            `UPDATE workflow_etapa
             SET orden = $1, updated_at = now()
             WHERE id = $2
               AND workflow_id = $3`,
            [index + 1, etapaIds[index], workflowId],
          );
        }

        await syncEtapaBoundaryFlags(tx, workflowId);
      });
    } catch (error) {
      logPostgresError("workflowRepository.reorderEtapas", error);
      rethrowDbError(error);
    }
  },

  async getParteById(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
  ): Promise<WorkflowParteRow> {
    const row = await queryOne<WorkflowParteRow>(
      `SELECT
         id, workflow_id, nombre, es_principal, obligatoria, orden,
         created_at, updated_at
       FROM workflow_parte
       WHERE id = $1
         AND workflow_id = $2`,
      [parteId, workflowId],
    );
    if (!row) throw new NotFoundError("Parte no encontrada");
    return row;
  },

  async findParteByNombre(
    _ctx: DbContext,
    workflowId: string,
    nombre: string,
    excludeId?: string,
  ): Promise<WorkflowParteRow | null> {
    const params: unknown[] = [workflowId, nombre.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowParteRow>(
      `SELECT
         id, workflow_id, nombre, es_principal, obligatoria, orden,
         created_at, updated_at
       FROM workflow_parte
       WHERE workflow_id = $1
         AND lower(nombre) = lower($2)${excludeClause}`,
      params,
    );
  },

  async listParteIds(_ctx: DbContext, workflowId: string): Promise<string[]> {
    const rows = await queryRows<{ id: string }>(
      `SELECT id
       FROM workflow_parte
       WHERE workflow_id = $1
       ORDER BY orden ASC, created_at ASC, id ASC`,
      [workflowId],
    );
    return rows.map((row) => row.id);
  },

  async countPrincipalPartes(
    _ctx: DbContext,
    workflowId: string,
  ): Promise<number> {
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM workflow_parte
       WHERE workflow_id = $1
         AND es_principal = true`,
      [workflowId],
    );
  },

  async getPrincipalParte(
    _ctx: DbContext,
    workflowId: string,
  ): Promise<WorkflowParteRow | null> {
    return queryOne<WorkflowParteRow>(
      `SELECT
         id, workflow_id, nombre, es_principal, obligatoria, orden,
         created_at, updated_at
       FROM workflow_parte
       WHERE workflow_id = $1
         AND es_principal = true`,
      [workflowId],
    );
  },

  async createParte(
    _ctx: DbContext,
    workflowId: string,
    payload: {
      nombre: string;
      es_principal: boolean;
      obligatoria: boolean;
    },
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const countRows = await tx.unsafe<{ count: string }[]>(
          `SELECT COUNT(*)::text AS count
           FROM workflow_parte
           WHERE workflow_id = $1`,
          [workflowId],
        );
        const existingCount = Number.parseInt(countRows[0]?.count ?? "0", 10);

        let esPrincipal = payload.es_principal;
        let obligatoria = payload.obligatoria;

        if (existingCount === 0) {
          esPrincipal = true;
          obligatoria = true;
        } else if (esPrincipal) {
          obligatoria = true;
          await tx.unsafe(
            `UPDATE workflow_parte
             SET es_principal = false, updated_at = now()
             WHERE workflow_id = $1`,
            [workflowId],
          );
        }

        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_parte
           WHERE workflow_id = $1`,
          [workflowId],
        );
        const nextOrden = nextRows[0]?.next_orden ?? 1;

        await tx.unsafe(
          `INSERT INTO workflow_parte (
             workflow_id, nombre, es_principal, obligatoria, orden
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            workflowId,
            payload.nombre.trim(),
            esPrincipal,
            obligatoria,
            nextOrden,
          ],
        );
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async updateParte(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
    payload: {
      nombre?: string;
      es_principal?: boolean;
      obligatoria?: boolean;
    },
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        if (payload.es_principal === true) {
          await tx.unsafe(
            `UPDATE workflow_parte
             SET es_principal = false, updated_at = now()
             WHERE workflow_id = $1`,
            [workflowId],
          );
        }

        const sets: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (payload.nombre !== undefined) {
          sets.push(`nombre = $${paramIndex}`);
          params.push(payload.nombre.trim());
          paramIndex += 1;
        }
        if (payload.es_principal !== undefined) {
          sets.push(`es_principal = $${paramIndex}`);
          params.push(payload.es_principal);
          paramIndex += 1;
          if (payload.es_principal) {
            sets.push(`obligatoria = true`);
          }
        }
        if (payload.obligatoria !== undefined && payload.es_principal !== true) {
          sets.push(`obligatoria = $${paramIndex}`);
          params.push(payload.obligatoria);
          paramIndex += 1;
        }

        if (!sets.length) return;

        sets.push("updated_at = now()");
        params.push(parteId, workflowId);

        const rows = await tx.unsafe<{ id: string }[]>(
          `UPDATE workflow_parte
           SET ${sets.join(", ")}
           WHERE id = $${paramIndex}
             AND workflow_id = $${paramIndex + 1}
           RETURNING id`,
          params as (string | boolean)[],
        );

        if (!rows.length) throw new NotFoundError("Parte no encontrada");
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async deleteParte(_ctx: DbContext, workflowId: string, parteId: string): Promise<void> {
    await sql.begin(async (tx) => {
      const deleted = await tx.unsafe<{ id: string }[]>(
        `DELETE FROM workflow_parte
         WHERE id = $1
           AND workflow_id = $2
         RETURNING id`,
        [parteId, workflowId],
      );

      if (!deleted.length) throw new NotFoundError("Parte no encontrada");

      await tx.unsafe(
        `WITH ranked AS (
           SELECT
             id,
             ROW_NUMBER() OVER (
               ORDER BY orden ASC, created_at ASC, id ASC
             ) AS new_orden
           FROM workflow_parte
           WHERE workflow_id = $1
         )
         UPDATE workflow_parte p
         SET
           orden = r.new_orden,
           updated_at = now()
         FROM ranked r
         WHERE p.id = r.id
           AND p.orden IS DISTINCT FROM r.new_orden`,
        [workflowId],
      );
    });
  },

  async reorderPartes(
    _ctx: DbContext,
    workflowId: string,
    parteIds: string[],
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const existing = await tx.unsafe<{ id: string }[]>(
        `SELECT id
         FROM workflow_parte
         WHERE workflow_id = $1
         ORDER BY orden ASC, created_at ASC, id ASC`,
        [workflowId],
      );

      if (existing.length !== parteIds.length) {
        throw new NotFoundError("Parte no encontrada");
      }

      const existingIds = new Set(existing.map((row) => row.id));
      for (const parteId of parteIds) {
        if (!existingIds.has(parteId)) {
          throw new NotFoundError("Parte no encontrada");
        }
      }

      for (let index = 0; index < parteIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_parte
           SET orden = $1, updated_at = now()
           WHERE id = $2
             AND workflow_id = $3`,
          [10000 + index + 1, parteIds[index], workflowId],
        );
      }

      for (let index = 0; index < parteIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_parte
           SET orden = $1, updated_at = now()
           WHERE id = $2
             AND workflow_id = $3`,
          [index + 1, parteIds[index], workflowId],
        );
      }
    });
  },

  async countPartes(_ctx: DbContext, workflowId: string): Promise<number> {
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM workflow_parte
       WHERE workflow_id = $1`,
      [workflowId],
    );
  },

  async countTareas(_ctx: DbContext, workflowId: string): Promise<number> {
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM workflow_tarea t
       INNER JOIN workflow_etapa e ON e.id = t.workflow_etapa_id
       WHERE e.workflow_id = $1`,
      [workflowId],
    );
  },

  async getTareaById(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
    tareaId: string,
  ): Promise<WorkflowTareaRow> {
    const row = await queryOne<WorkflowTareaRow>(
      `SELECT
         t.id, t.workflow_etapa_id, t.titulo, t.descripcion, t.obligatoria,
         t.orden, t.created_at, t.updated_at
       FROM workflow_tarea t
       INNER JOIN workflow_etapa e ON e.id = t.workflow_etapa_id
       WHERE t.id = $1
         AND t.workflow_etapa_id = $2
         AND e.workflow_id = $3`,
      [tareaId, etapaId, workflowId],
    );
    if (!row) throw new NotFoundError("Tarea no encontrada");
    return row;
  },

  async findTareaByTitulo(
    _ctx: DbContext,
    etapaId: string,
    titulo: string,
    excludeId?: string,
  ): Promise<WorkflowTareaRow | null> {
    const params: unknown[] = [etapaId, titulo.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND t.id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowTareaRow>(
      `SELECT
         t.id, t.workflow_etapa_id, t.titulo, t.descripcion, t.obligatoria,
         t.orden, t.created_at, t.updated_at
       FROM workflow_tarea t
       WHERE t.workflow_etapa_id = $1
         AND lower(t.titulo) = lower($2)${excludeClause}`,
      params,
    );
  },

  async createTarea(
    _ctx: DbContext,
    etapaId: string,
    payload: {
      titulo: string;
      descripcion?: string | null;
      obligatoria: boolean;
    },
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_tarea
           WHERE workflow_etapa_id = $1`,
          [etapaId],
        );
        const nextOrden = nextRows[0]?.next_orden ?? 1;

        await tx.unsafe(
          `INSERT INTO workflow_tarea (
             workflow_etapa_id, titulo, descripcion, obligatoria, orden
           ) VALUES ($1, $2, $3, $4, $5)`,
          [
            etapaId,
            payload.titulo.trim(),
            payload.descripcion ?? null,
            payload.obligatoria,
            nextOrden,
          ],
        );
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async updateTarea(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
    tareaId: string,
    payload: {
      titulo?: string;
      descripcion?: string | null;
      obligatoria?: boolean;
    },
  ): Promise<void> {
    const sets: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (payload.titulo !== undefined) {
      sets.push(`titulo = $${paramIndex}`);
      params.push(payload.titulo.trim());
      paramIndex += 1;
    }
    if (payload.descripcion !== undefined) {
      sets.push(`descripcion = $${paramIndex}`);
      params.push(payload.descripcion);
      paramIndex += 1;
    }
    if (payload.obligatoria !== undefined) {
      sets.push(`obligatoria = $${paramIndex}`);
      params.push(payload.obligatoria);
      paramIndex += 1;
    }

    if (!sets.length) return;

    sets.push("updated_at = now()");
    params.push(tareaId, etapaId, workflowId);

    try {
      const rows = await queryRows<{ id: string }>(
        `UPDATE workflow_tarea t
         SET ${sets.join(", ")}
         FROM workflow_etapa e
         WHERE t.id = $${paramIndex}
           AND t.workflow_etapa_id = $${paramIndex + 1}
           AND e.id = t.workflow_etapa_id
           AND e.workflow_id = $${paramIndex + 2}
         RETURNING t.id`,
        params,
      );

      if (!rows.length) throw new NotFoundError("Tarea no encontrada");
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async deleteTarea(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
    tareaId: string,
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const deleted = await tx.unsafe<{ id: string }[]>(
        `DELETE FROM workflow_tarea t
         USING workflow_etapa e
         WHERE t.id = $1
           AND t.workflow_etapa_id = $2
           AND e.id = t.workflow_etapa_id
           AND e.workflow_id = $3
         RETURNING t.id`,
        [tareaId, etapaId, workflowId],
      );

      if (!deleted.length) throw new NotFoundError("Tarea no encontrada");

      await tx.unsafe(
        `WITH ranked AS (
           SELECT
             id,
             ROW_NUMBER() OVER (
               ORDER BY orden ASC, created_at ASC, id ASC
             ) AS new_orden
           FROM workflow_tarea
           WHERE workflow_etapa_id = $1
         )
         UPDATE workflow_tarea t
         SET
           orden = r.new_orden,
           updated_at = now()
         FROM ranked r
         WHERE t.id = r.id
           AND t.orden IS DISTINCT FROM r.new_orden`,
        [etapaId],
      );
    });
  },

  async reorderTareas(
    _ctx: DbContext,
    workflowId: string,
    etapaId: string,
    tareaIds: string[],
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const existing = await tx.unsafe<{ id: string }[]>(
        `SELECT t.id
         FROM workflow_tarea t
         INNER JOIN workflow_etapa e ON e.id = t.workflow_etapa_id
         WHERE t.workflow_etapa_id = $1
           AND e.workflow_id = $2
         ORDER BY t.orden ASC, t.created_at ASC, t.id ASC`,
        [etapaId, workflowId],
      );

      if (existing.length !== tareaIds.length) {
        throw new NotFoundError("Tarea no encontrada");
      }

      const existingIds = new Set(existing.map((row) => row.id));
      for (const tareaId of tareaIds) {
        if (!existingIds.has(tareaId)) {
          throw new NotFoundError("Tarea no encontrada");
        }
      }

      for (let index = 0; index < tareaIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_tarea t
           SET orden = $1, updated_at = now()
           FROM workflow_etapa e
           WHERE t.id = $2
             AND t.workflow_etapa_id = $3
             AND e.id = t.workflow_etapa_id
             AND e.workflow_id = $4`,
          [10000 + index + 1, tareaIds[index], etapaId, workflowId],
        );
      }

      for (let index = 0; index < tareaIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_tarea t
           SET orden = $1, updated_at = now()
           FROM workflow_etapa e
           WHERE t.id = $2
             AND t.workflow_etapa_id = $3
             AND e.id = t.workflow_etapa_id
             AND e.workflow_id = $4`,
          [index + 1, tareaIds[index], etapaId, workflowId],
        );
      }
    });
  },

  async getCampoDinamicoById(
    _ctx: DbContext,
    workflowId: string,
    campoDinamicoId: string,
  ): Promise<WorkflowCampoDinamicoRow> {
    const row = await queryOne<WorkflowCampoDinamicoRow>(
      `SELECT
         id, workflow_id, clave, etiqueta, tipo, regex, minimo, maximo,
         longitud_maxima, requerido, placeholder, ayuda, valor_default,
         visible_tabla, ancho_grilla, orden, created_at, updated_at
       FROM workflow_campo_dinamico
       WHERE id = $1
         AND workflow_id = $2`,
      [campoDinamicoId, workflowId],
    );
    if (!row) throw new NotFoundError("Campo dinámico no encontrado");
    return row;
  },

  async findCampoDinamicoByClave(
    _ctx: DbContext,
    workflowId: string,
    clave: string,
    excludeId?: string,
  ): Promise<WorkflowCampoDinamicoRow | null> {
    const params: unknown[] = [workflowId, clave.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowCampoDinamicoRow>(
      `SELECT
         id, workflow_id, clave, etiqueta, tipo, regex, minimo, maximo,
         longitud_maxima, requerido, placeholder, ayuda, valor_default,
         visible_tabla, ancho_grilla, orden, created_at, updated_at
       FROM workflow_campo_dinamico
       WHERE workflow_id = $1
         AND lower(clave) = lower($2)${excludeClause}`,
      params,
    );
  },

  async findCampoDinamicoByEtiqueta(
    _ctx: DbContext,
    workflowId: string,
    etiqueta: string,
    excludeId?: string,
  ): Promise<WorkflowCampoDinamicoRow | null> {
    const params: unknown[] = [workflowId, etiqueta.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowCampoDinamicoRow>(
      `SELECT
         id, workflow_id, clave, etiqueta, tipo, regex, minimo, maximo,
         longitud_maxima, requerido, placeholder, ayuda, valor_default,
         visible_tabla, ancho_grilla, orden, created_at, updated_at
       FROM workflow_campo_dinamico
       WHERE workflow_id = $1
         AND lower(etiqueta) = lower($2)${excludeClause}`,
      params,
    );
  },

  async countCamposDinamicos(
    _ctx: DbContext,
    workflowId: string,
  ): Promise<number> {
    return queryCount(
      `SELECT COUNT(*)::text AS count
       FROM workflow_campo_dinamico
       WHERE workflow_id = $1`,
      [workflowId],
    );
  },

  async listTargetCampoClavesEtiquetas(
    _ctx: DbContext,
    workflowId: string,
  ): Promise<{ claves: string[]; etiquetas: string[] }> {
    const rows = await queryRows<{ clave: string; etiqueta: string }>(
      `SELECT lower(clave) AS clave, lower(etiqueta) AS etiqueta
       FROM workflow_campo_dinamico
       WHERE workflow_id = $1`,
      [workflowId],
    );
    return {
      claves: rows.map((row) => row.clave),
      etiquetas: rows.map((row) => row.etiqueta),
    };
  },

  async listCamposDinamicosWithOpciones(
    ctx: DbContext,
    sourceWorkflowId: string,
    campoDinamicoIds?: string[],
  ): Promise<WorkflowCampoDinamicoWithOpciones[]> {
    const tenantId = requireTenantId(ctx);
    const access = buildAccessClause("w", tenantId, 2);
    const source = await queryOne<{ id: string }>(
      `SELECT w.id
       FROM workflow w
       WHERE w.id = $1 AND ${access.clause}`,
      [sourceWorkflowId, ...access.params],
    );
    if (!source) throw new NotFoundError("Workflow no encontrado");

    const params: unknown[] = [sourceWorkflowId];
    let idFilter = "";

    if (campoDinamicoIds !== undefined) {
      idFilter = " AND c.id = ANY($2::uuid[])";
      params.push(campoDinamicoIds);
    }

    const campos = await queryRows<
      WorkflowCampoDinamicoRow & { opciones: WorkflowCampoOpcionRow[] | null }
    >(
      `SELECT
         c.id, c.workflow_id, c.clave, c.etiqueta, c.tipo, c.regex,
         c.minimo, c.maximo, c.longitud_maxima, c.requerido, c.placeholder,
         c.ayuda, c.valor_default, c.visible_tabla, c.ancho_grilla, c.orden,
         c.created_at, c.updated_at,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', o.id,
                 'workflow_campo_dinamico_id', o.workflow_campo_dinamico_id,
                 'valor', o.valor,
                 'etiqueta', o.etiqueta,
                 'orden', o.orden,
                 'created_at', o.created_at
               )
               ORDER BY o.orden ASC, o.created_at ASC, o.id ASC
             )
             FROM workflow_campo_opcion o
             WHERE o.workflow_campo_dinamico_id = c.id
           ),
           '[]'::json
         ) AS opciones
       FROM workflow_campo_dinamico c
       WHERE c.workflow_id = $1${idFilter}
       ORDER BY c.orden ASC, c.created_at ASC, c.id ASC`,
      params,
    );

    if (campoDinamicoIds !== undefined) {
      const uniqueIds = new Set(campoDinamicoIds);
      if (campos.length !== uniqueIds.size) {
        throw new NotFoundError("Campo dinámico no encontrado");
      }
    }

    return campos.map((campo) => ({
      ...campo,
      opciones: campo.opciones ?? [],
    }));
  },

  async appendCamposDinamicosSnapshot(
    _ctx: DbContext,
    workflowId: string,
    snapshots: WorkflowCampoDinamicoSnapshot[],
  ): Promise<void> {
    if (snapshots.length === 0) return;

    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_campo_dinamico
           WHERE workflow_id = $1`,
          [workflowId],
        );
        let nextOrden = nextRows[0]?.next_orden ?? 1;

        for (const snapshot of snapshots) {
          const inserted = await tx.unsafe<{ id: string }[]>(
            `INSERT INTO workflow_campo_dinamico (
               workflow_id, clave, etiqueta, tipo, regex, minimo, maximo,
               longitud_maxima, requerido, placeholder, ayuda, valor_default,
               visible_tabla, ancho_grilla, orden
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING id`,
            [
              workflowId,
              snapshot.clave.trim(),
              snapshot.etiqueta.trim(),
              snapshot.tipo,
              snapshot.regex,
              snapshot.minimo,
              snapshot.maximo,
              snapshot.longitud_maxima,
              snapshot.requerido,
              snapshot.placeholder,
              snapshot.ayuda,
              snapshot.valor_default,
              snapshot.visible_tabla,
              snapshot.ancho_grilla,
              nextOrden,
            ],
          );

          const campoId = inserted[0]?.id;
          if (!campoId) throw new Error("Error al copiar campos dinámicos");

          for (const opcion of snapshot.opciones) {
            await tx.unsafe(
              `INSERT INTO workflow_campo_opcion (
                 workflow_campo_dinamico_id, valor, etiqueta, orden
               ) VALUES ($1, $2, $3, $4)`,
              [
                campoId,
                opcion.valor.trim(),
                opcion.etiqueta.trim(),
                opcion.orden,
              ],
            );
          }

          nextOrden += 1;
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async listCampoDinamicoOpciones(
    _ctx: DbContext,
    campoDinamicoId: string,
  ): Promise<WorkflowCampoOpcionRow[]> {
    return queryRows<WorkflowCampoOpcionRow>(
      `SELECT
         id, workflow_campo_dinamico_id, valor, etiqueta, orden, created_at
       FROM workflow_campo_opcion
       WHERE workflow_campo_dinamico_id = $1
       ORDER BY orden ASC, created_at ASC, id ASC`,
      [campoDinamicoId],
    );
  },

  async createCampoDinamico(
    _ctx: DbContext,
    workflowId: string,
    payload: {
      clave: string;
      etiqueta: string;
      tipo: string;
      regex?: string | null;
      minimo?: number | null;
      maximo?: number | null;
      longitud_maxima?: number | null;
      requerido: boolean;
      placeholder?: string | null;
      ayuda?: string | null;
      valor_default?: string | null;
      visible_tabla: boolean;
      ancho_grilla: number;
    },
    opciones: Array<{ valor: string; etiqueta: string; orden: number }> = [],
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_campo_dinamico
           WHERE workflow_id = $1`,
          [workflowId],
        );
        const nextOrden = nextRows[0]?.next_orden ?? 1;

        const inserted = await tx.unsafe<{ id: string }[]>(
          `INSERT INTO workflow_campo_dinamico (
             workflow_id, clave, etiqueta, tipo, regex, minimo, maximo,
             longitud_maxima, requerido, placeholder, ayuda, valor_default,
             visible_tabla, ancho_grilla, orden
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING id`,
          [
            workflowId,
            payload.clave.trim(),
            payload.etiqueta.trim(),
            payload.tipo,
            payload.regex ?? null,
            payload.minimo ?? null,
            payload.maximo ?? null,
            payload.longitud_maxima ?? null,
            payload.requerido,
            payload.placeholder ?? null,
            payload.ayuda ?? null,
            payload.valor_default ?? null,
            payload.visible_tabla,
            payload.ancho_grilla,
            nextOrden,
          ],
        );

        const campoId = inserted[0]?.id;
        if (!campoId) throw new Error("Error al crear el campo dinámico");

        for (const opcion of opciones) {
          await tx.unsafe(
            `INSERT INTO workflow_campo_opcion (
               workflow_campo_dinamico_id, valor, etiqueta, orden
             ) VALUES ($1, $2, $3, $4)`,
            [campoId, opcion.valor.trim(), opcion.etiqueta.trim(), opcion.orden],
          );
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async updateCampoDinamico(
    _ctx: DbContext,
    workflowId: string,
    campoDinamicoId: string,
    payload: {
      clave?: string;
      etiqueta?: string;
      tipo?: string;
      regex?: string | null;
      minimo?: number | null;
      maximo?: number | null;
      longitud_maxima?: number | null;
      requerido?: boolean;
      placeholder?: string | null;
      ayuda?: string | null;
      valor_default?: string | null;
      visible_tabla?: boolean;
      ancho_grilla?: number;
    },
    opciones?: Array<{ valor: string; etiqueta: string; orden: number }> | null,
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const sets: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (payload.clave !== undefined) {
          sets.push(`clave = $${paramIndex}`);
          params.push(payload.clave.trim());
          paramIndex += 1;
        }
        if (payload.etiqueta !== undefined) {
          sets.push(`etiqueta = $${paramIndex}`);
          params.push(payload.etiqueta.trim());
          paramIndex += 1;
        }
        if (payload.tipo !== undefined) {
          sets.push(`tipo = $${paramIndex}`);
          params.push(payload.tipo);
          paramIndex += 1;
        }
        if (payload.regex !== undefined) {
          sets.push(`regex = $${paramIndex}`);
          params.push(payload.regex);
          paramIndex += 1;
        }
        if (payload.minimo !== undefined) {
          sets.push(`minimo = $${paramIndex}`);
          params.push(payload.minimo);
          paramIndex += 1;
        }
        if (payload.maximo !== undefined) {
          sets.push(`maximo = $${paramIndex}`);
          params.push(payload.maximo);
          paramIndex += 1;
        }
        if (payload.longitud_maxima !== undefined) {
          sets.push(`longitud_maxima = $${paramIndex}`);
          params.push(payload.longitud_maxima);
          paramIndex += 1;
        }
        if (payload.requerido !== undefined) {
          sets.push(`requerido = $${paramIndex}`);
          params.push(payload.requerido);
          paramIndex += 1;
        }
        if (payload.placeholder !== undefined) {
          sets.push(`placeholder = $${paramIndex}`);
          params.push(payload.placeholder);
          paramIndex += 1;
        }
        if (payload.ayuda !== undefined) {
          sets.push(`ayuda = $${paramIndex}`);
          params.push(payload.ayuda);
          paramIndex += 1;
        }
        if (payload.valor_default !== undefined) {
          sets.push(`valor_default = $${paramIndex}`);
          params.push(payload.valor_default);
          paramIndex += 1;
        }
        if (payload.visible_tabla !== undefined) {
          sets.push(`visible_tabla = $${paramIndex}`);
          params.push(payload.visible_tabla);
          paramIndex += 1;
        }
        if (payload.ancho_grilla !== undefined) {
          sets.push(`ancho_grilla = $${paramIndex}`);
          params.push(payload.ancho_grilla);
          paramIndex += 1;
        }

        if (sets.length) {
          sets.push("updated_at = now()");
          params.push(campoDinamicoId, workflowId);

          const rows = await tx.unsafe<{ id: string }[]>(
            `UPDATE workflow_campo_dinamico
             SET ${sets.join(", ")}
             WHERE id = $${paramIndex}
               AND workflow_id = $${paramIndex + 1}
             RETURNING id`,
            params as (string | number | boolean | null)[],
          );

          if (!rows.length) {
            throw new NotFoundError("Campo dinámico no encontrado");
          }
        } else if (opciones === undefined) {
          const exists = await tx.unsafe<{ id: string }[]>(
            `SELECT id
             FROM workflow_campo_dinamico
             WHERE id = $1
               AND workflow_id = $2`,
            [campoDinamicoId, workflowId],
          );
          if (!exists.length) {
            throw new NotFoundError("Campo dinámico no encontrado");
          }
        }

        if (opciones !== undefined) {
          await tx.unsafe(
            `DELETE FROM workflow_campo_opcion
             WHERE workflow_campo_dinamico_id = $1`,
            [campoDinamicoId],
          );

          for (const opcion of opciones ?? []) {
            await tx.unsafe(
              `INSERT INTO workflow_campo_opcion (
                 workflow_campo_dinamico_id, valor, etiqueta, orden
               ) VALUES ($1, $2, $3, $4)`,
              [
                campoDinamicoId,
                opcion.valor.trim(),
                opcion.etiqueta.trim(),
                opcion.orden,
              ],
            );
          }
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async deleteCampoDinamico(
    _ctx: DbContext,
    workflowId: string,
    campoDinamicoId: string,
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const deleted = await tx.unsafe<{ id: string }[]>(
        `DELETE FROM workflow_campo_dinamico
         WHERE id = $1
           AND workflow_id = $2
         RETURNING id`,
        [campoDinamicoId, workflowId],
      );

      if (!deleted.length) {
        throw new NotFoundError("Campo dinámico no encontrado");
      }

      await tx.unsafe(
        `WITH ranked AS (
           SELECT
             id,
             ROW_NUMBER() OVER (
               ORDER BY orden ASC, created_at ASC, id ASC
             ) AS new_orden
           FROM workflow_campo_dinamico
           WHERE workflow_id = $1
         )
         UPDATE workflow_campo_dinamico c
         SET
           orden = r.new_orden,
           updated_at = now()
         FROM ranked r
         WHERE c.id = r.id
           AND c.orden IS DISTINCT FROM r.new_orden`,
        [workflowId],
      );
    });
  },

  async reorderCamposDinamicos(
    _ctx: DbContext,
    workflowId: string,
    campoDinamicoIds: string[],
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const existing = await tx.unsafe<{ id: string }[]>(
          `SELECT id
           FROM workflow_campo_dinamico
           WHERE workflow_id = $1
           ORDER BY orden ASC, created_at ASC, id ASC`,
          [workflowId],
        );

        if (existing.length !== campoDinamicoIds.length) {
          throw new NotFoundError("Campo dinámico no encontrado");
        }

        const existingIds = new Set(existing.map((row) => row.id));
        for (const campoId of campoDinamicoIds) {
          if (!existingIds.has(campoId)) {
            throw new NotFoundError("Campo dinámico no encontrado");
          }
        }

        for (let index = 0; index < campoDinamicoIds.length; index += 1) {
          await tx.unsafe(
            `UPDATE workflow_campo_dinamico
             SET orden = $1, updated_at = now()
             WHERE id = $2
               AND workflow_id = $3`,
            [10000 + index + 1, campoDinamicoIds[index], workflowId],
          );
        }

        for (let index = 0; index < campoDinamicoIds.length; index += 1) {
          await tx.unsafe(
            `UPDATE workflow_campo_dinamico
             SET orden = $1, updated_at = now()
             WHERE id = $2
               AND workflow_id = $3`,
            [index + 1, campoDinamicoIds[index], workflowId],
          );
        }
      });
    } catch (error) {
      logPostgresError("workflowRepository.reorderCamposDinamicos", error);
      rethrowDbError(error);
    }
  },

  async getParteCampoDinamicoById(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
    campoDinamicoId: string,
  ): Promise<WorkflowParteCampoDinamicoRow> {
    const row = await queryOne<WorkflowParteCampoDinamicoRow>(
      `SELECT
         c.id, c.workflow_parte_id, c.clave, c.etiqueta, c.tipo, c.regex,
         c.minimo, c.maximo, c.longitud_maxima, c.requerido, c.placeholder,
         c.ayuda, c.valor_default, c.visible_tabla, c.ancho_grilla, c.orden,
         c.created_at, c.updated_at
       FROM workflow_parte_campo_dinamico c
       INNER JOIN workflow_parte p ON p.id = c.workflow_parte_id
       WHERE c.id = $1
         AND c.workflow_parte_id = $2
         AND p.workflow_id = $3`,
      [campoDinamicoId, parteId, workflowId],
    );
    if (!row) throw new NotFoundError("Campo dinámico no encontrado");
    return row;
  },

  async findParteCampoDinamicoByClave(
    _ctx: DbContext,
    parteId: string,
    clave: string,
    excludeId?: string,
  ): Promise<WorkflowParteCampoDinamicoRow | null> {
    const params: unknown[] = [parteId, clave.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowParteCampoDinamicoRow>(
      `SELECT
         id, workflow_parte_id, clave, etiqueta, tipo, regex, minimo, maximo,
         longitud_maxima, requerido, placeholder, ayuda, valor_default,
         visible_tabla, ancho_grilla, orden, created_at, updated_at
       FROM workflow_parte_campo_dinamico
       WHERE workflow_parte_id = $1
         AND lower(clave) = lower($2)${excludeClause}`,
      params,
    );
  },

  async findParteCampoDinamicoByEtiqueta(
    _ctx: DbContext,
    parteId: string,
    etiqueta: string,
    excludeId?: string,
  ): Promise<WorkflowParteCampoDinamicoRow | null> {
    const params: unknown[] = [parteId, etiqueta.trim()];
    let excludeClause = "";

    if (excludeId) {
      excludeClause = " AND id <> $3";
      params.push(excludeId);
    }

    return queryOne<WorkflowParteCampoDinamicoRow>(
      `SELECT
         id, workflow_parte_id, clave, etiqueta, tipo, regex, minimo, maximo,
         longitud_maxima, requerido, placeholder, ayuda, valor_default,
         visible_tabla, ancho_grilla, orden, created_at, updated_at
       FROM workflow_parte_campo_dinamico
       WHERE workflow_parte_id = $1
         AND lower(etiqueta) = lower($2)${excludeClause}`,
      params,
    );
  },

  async listParteCampoDinamicoOpciones(
    _ctx: DbContext,
    campoDinamicoId: string,
  ): Promise<WorkflowParteCampoOpcionRow[]> {
    return queryRows<WorkflowParteCampoOpcionRow>(
      `SELECT
         id, workflow_parte_campo_dinamico_id, valor, etiqueta, orden, created_at
       FROM workflow_parte_campo_opcion
       WHERE workflow_parte_campo_dinamico_id = $1
       ORDER BY orden ASC, created_at ASC, id ASC`,
      [campoDinamicoId],
    );
  },

  async listParteCamposDinamicosWithOpciones(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
  ): Promise<WorkflowParteCampoDinamicoWithOpciones[]> {
    await this.getParteById(_ctx, workflowId, parteId);

    const campos = await queryRows<
      WorkflowParteCampoDinamicoRow & {
        opciones: WorkflowParteCampoOpcionRow[] | null;
      }
    >(
      `SELECT
         c.id, c.workflow_parte_id, c.clave, c.etiqueta, c.tipo, c.regex,
         c.minimo, c.maximo, c.longitud_maxima, c.requerido, c.placeholder,
         c.ayuda, c.valor_default, c.visible_tabla, c.ancho_grilla, c.orden,
         c.created_at, c.updated_at,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'id', o.id,
                 'workflow_parte_campo_dinamico_id', o.workflow_parte_campo_dinamico_id,
                 'valor', o.valor,
                 'etiqueta', o.etiqueta,
                 'orden', o.orden,
                 'created_at', o.created_at
               )
               ORDER BY o.orden ASC, o.created_at ASC, o.id ASC
             )
             FROM workflow_parte_campo_opcion o
             WHERE o.workflow_parte_campo_dinamico_id = c.id
           ),
           '[]'::json
         ) AS opciones
       FROM workflow_parte_campo_dinamico c
       WHERE c.workflow_parte_id = $1
       ORDER BY c.orden ASC, c.created_at ASC, c.id ASC`,
      [parteId],
    );

    return campos.map((campo) => ({
      ...campo,
      opciones: campo.opciones ?? [],
    }));
  },

  async createParteCampoDinamico(
    _ctx: DbContext,
    parteId: string,
    payload: {
      clave: string;
      etiqueta: string;
      tipo: string;
      regex?: string | null;
      minimo?: number | null;
      maximo?: number | null;
      longitud_maxima?: number | null;
      requerido: boolean;
      placeholder?: string | null;
      ayuda?: string | null;
      valor_default?: string | null;
      visible_tabla: boolean;
      ancho_grilla: number;
    },
    opciones: Array<{ valor: string; etiqueta: string; orden: number }> = [],
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_parte_campo_dinamico
           WHERE workflow_parte_id = $1`,
          [parteId],
        );
        const nextOrden = nextRows[0]?.next_orden ?? 1;

        const inserted = await tx.unsafe<{ id: string }[]>(
          `INSERT INTO workflow_parte_campo_dinamico (
             workflow_parte_id, clave, etiqueta, tipo, regex, minimo, maximo,
             longitud_maxima, requerido, placeholder, ayuda, valor_default,
             visible_tabla, ancho_grilla, orden
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
           RETURNING id`,
          [
            parteId,
            payload.clave.trim(),
            payload.etiqueta.trim(),
            payload.tipo,
            payload.regex ?? null,
            payload.minimo ?? null,
            payload.maximo ?? null,
            payload.longitud_maxima ?? null,
            payload.requerido,
            payload.placeholder ?? null,
            payload.ayuda ?? null,
            payload.valor_default ?? null,
            payload.visible_tabla,
            payload.ancho_grilla,
            nextOrden,
          ],
        );

        const campoId = inserted[0]?.id;
        if (!campoId) throw new Error("Error al crear el campo dinámico de parte");

        for (const opcion of opciones) {
          await tx.unsafe(
            `INSERT INTO workflow_parte_campo_opcion (
               workflow_parte_campo_dinamico_id, valor, etiqueta, orden
             ) VALUES ($1, $2, $3, $4)`,
            [campoId, opcion.valor.trim(), opcion.etiqueta.trim(), opcion.orden],
          );
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async updateParteCampoDinamico(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
    campoDinamicoId: string,
    payload: {
      clave?: string;
      etiqueta?: string;
      tipo?: string;
      regex?: string | null;
      minimo?: number | null;
      maximo?: number | null;
      longitud_maxima?: number | null;
      requerido?: boolean;
      placeholder?: string | null;
      ayuda?: string | null;
      valor_default?: string | null;
      visible_tabla?: boolean;
      ancho_grilla?: number;
    },
    opciones?: Array<{ valor: string; etiqueta: string; orden: number }> | null,
  ): Promise<void> {
    try {
      await sql.begin(async (tx) => {
        const sets: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (payload.clave !== undefined) {
          sets.push(`clave = $${paramIndex}`);
          params.push(payload.clave.trim());
          paramIndex += 1;
        }
        if (payload.etiqueta !== undefined) {
          sets.push(`etiqueta = $${paramIndex}`);
          params.push(payload.etiqueta.trim());
          paramIndex += 1;
        }
        if (payload.tipo !== undefined) {
          sets.push(`tipo = $${paramIndex}`);
          params.push(payload.tipo);
          paramIndex += 1;
        }
        if (payload.regex !== undefined) {
          sets.push(`regex = $${paramIndex}`);
          params.push(payload.regex);
          paramIndex += 1;
        }
        if (payload.minimo !== undefined) {
          sets.push(`minimo = $${paramIndex}`);
          params.push(payload.minimo);
          paramIndex += 1;
        }
        if (payload.maximo !== undefined) {
          sets.push(`maximo = $${paramIndex}`);
          params.push(payload.maximo);
          paramIndex += 1;
        }
        if (payload.longitud_maxima !== undefined) {
          sets.push(`longitud_maxima = $${paramIndex}`);
          params.push(payload.longitud_maxima);
          paramIndex += 1;
        }
        if (payload.requerido !== undefined) {
          sets.push(`requerido = $${paramIndex}`);
          params.push(payload.requerido);
          paramIndex += 1;
        }
        if (payload.placeholder !== undefined) {
          sets.push(`placeholder = $${paramIndex}`);
          params.push(payload.placeholder);
          paramIndex += 1;
        }
        if (payload.ayuda !== undefined) {
          sets.push(`ayuda = $${paramIndex}`);
          params.push(payload.ayuda);
          paramIndex += 1;
        }
        if (payload.valor_default !== undefined) {
          sets.push(`valor_default = $${paramIndex}`);
          params.push(payload.valor_default);
          paramIndex += 1;
        }
        if (payload.visible_tabla !== undefined) {
          sets.push(`visible_tabla = $${paramIndex}`);
          params.push(payload.visible_tabla);
          paramIndex += 1;
        }
        if (payload.ancho_grilla !== undefined) {
          sets.push(`ancho_grilla = $${paramIndex}`);
          params.push(payload.ancho_grilla);
          paramIndex += 1;
        }

        if (sets.length) {
          sets.push("updated_at = now()");
          params.push(campoDinamicoId, parteId, workflowId);

          const rows = await tx.unsafe<{ id: string }[]>(
            `UPDATE workflow_parte_campo_dinamico c
             SET ${sets.join(", ")}
             FROM workflow_parte p
             WHERE c.id = $${paramIndex}
               AND c.workflow_parte_id = $${paramIndex + 1}
               AND p.id = c.workflow_parte_id
               AND p.workflow_id = $${paramIndex + 2}
             RETURNING c.id`,
            params as (string | number | boolean | null)[],
          );

          if (!rows.length) {
            throw new NotFoundError("Campo dinámico no encontrado");
          }
        }

        if (opciones !== undefined) {
          const exists = await tx.unsafe<{ id: string }[]>(
            `SELECT c.id
             FROM workflow_parte_campo_dinamico c
             INNER JOIN workflow_parte p ON p.id = c.workflow_parte_id
             WHERE c.id = $1
               AND c.workflow_parte_id = $2
               AND p.workflow_id = $3`,
            [campoDinamicoId, parteId, workflowId],
          );
          if (!exists.length) {
            throw new NotFoundError("Campo dinámico no encontrado");
          }

          await tx.unsafe(
            `DELETE FROM workflow_parte_campo_opcion
             WHERE workflow_parte_campo_dinamico_id = $1`,
            [campoDinamicoId],
          );

          for (const opcion of opciones ?? []) {
            await tx.unsafe(
              `INSERT INTO workflow_parte_campo_opcion (
                 workflow_parte_campo_dinamico_id, valor, etiqueta, orden
               ) VALUES ($1, $2, $3, $4)`,
              [
                campoDinamicoId,
                opcion.valor.trim(),
                opcion.etiqueta.trim(),
                opcion.orden,
              ],
            );
          }
        } else if (!sets.length) {
          await this.getParteCampoDinamicoById(
            _ctx,
            workflowId,
            parteId,
            campoDinamicoId,
          );
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }
  },

  async deleteParteCampoDinamico(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
    campoDinamicoId: string,
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const deleted = await tx.unsafe<{ id: string }[]>(
        `DELETE FROM workflow_parte_campo_dinamico c
         USING workflow_parte p
         WHERE c.id = $1
           AND c.workflow_parte_id = $2
           AND p.id = c.workflow_parte_id
           AND p.workflow_id = $3
         RETURNING c.id`,
        [campoDinamicoId, parteId, workflowId],
      );

      if (!deleted.length) {
        throw new NotFoundError("Campo dinámico no encontrado");
      }

      await tx.unsafe(
        `WITH ranked AS (
           SELECT
             id,
             ROW_NUMBER() OVER (
               ORDER BY orden ASC, created_at ASC, id ASC
             ) AS new_orden
           FROM workflow_parte_campo_dinamico
           WHERE workflow_parte_id = $1
         )
         UPDATE workflow_parte_campo_dinamico c
         SET
           orden = r.new_orden,
           updated_at = now()
         FROM ranked r
         WHERE c.id = r.id
           AND c.orden IS DISTINCT FROM r.new_orden`,
        [parteId],
      );
    });
  },

  async reorderParteCamposDinamicos(
    _ctx: DbContext,
    workflowId: string,
    parteId: string,
    campoDinamicoIds: string[],
  ): Promise<void> {
    await sql.begin(async (tx) => {
      const existing = await tx.unsafe<{ id: string }[]>(
        `SELECT c.id
         FROM workflow_parte_campo_dinamico c
         INNER JOIN workflow_parte p ON p.id = c.workflow_parte_id
         WHERE c.workflow_parte_id = $1
           AND p.workflow_id = $2
         ORDER BY c.orden ASC, c.created_at ASC, c.id ASC`,
        [parteId, workflowId],
      );

      if (existing.length !== campoDinamicoIds.length) {
        throw new NotFoundError("Campo dinámico no encontrado");
      }

      const existingIds = new Set(existing.map((row) => row.id));
      for (const campoId of campoDinamicoIds) {
        if (!existingIds.has(campoId)) {
          throw new NotFoundError("Campo dinámico no encontrado");
        }
      }

      for (let index = 0; index < campoDinamicoIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_parte_campo_dinamico c
           SET orden = $1, updated_at = now()
           FROM workflow_parte p
           WHERE c.id = $2
             AND c.workflow_parte_id = $3
             AND p.id = c.workflow_parte_id
             AND p.workflow_id = $4`,
          [10000 + index + 1, campoDinamicoIds[index], parteId, workflowId],
        );
      }

      for (let index = 0; index < campoDinamicoIds.length; index += 1) {
        await tx.unsafe(
          `UPDATE workflow_parte_campo_dinamico c
           SET orden = $1, updated_at = now()
           FROM workflow_parte p
           WHERE c.id = $2
             AND c.workflow_parte_id = $3
             AND p.id = c.workflow_parte_id
             AND p.workflow_id = $4`,
          [index + 1, campoDinamicoIds[index], parteId, workflowId],
        );
      }
    });
  },

  async copyParteCamposFromParte(
    _ctx: DbContext,
    workflowId: string,
    targetParteId: string,
    sourceParteId: string,
  ): Promise<{ copied: number; skipped: number }> {
    await this.getParteById(_ctx, workflowId, targetParteId);
    await this.getParteById(_ctx, workflowId, sourceParteId);

    const sourceCampos = await this.listParteCamposDinamicosWithOpciones(
      _ctx,
      workflowId,
      sourceParteId,
    );

    if (sourceCampos.length === 0) {
      throw new NotFoundError("La parte origen no tiene campos dinámicos");
    }

    const targetEtiquetas = await queryRows<{ etiqueta: string }>(
      `SELECT lower(etiqueta) AS etiqueta
       FROM workflow_parte_campo_dinamico
       WHERE workflow_parte_id = $1`,
      [targetParteId],
    );
    const usedEtiquetas = new Set(targetEtiquetas.map((row) => row.etiqueta));

    const toCopy: WorkflowParteCampoDinamicoSnapshot[] = [];
    let skipped = 0;

    for (const campo of sourceCampos) {
      if (usedEtiquetas.has(campo.etiqueta.trim().toLowerCase())) {
        skipped += 1;
        continue;
      }

      const opciones = [...campo.opciones]
        .sort(
          (a, b) =>
            a.orden - b.orden ||
            a.created_at.localeCompare(b.created_at) ||
            a.id.localeCompare(b.id),
        )
        .map((opcion, index) => ({
          valor: opcion.valor,
          etiqueta: opcion.etiqueta,
          orden: index + 1,
        }));

      toCopy.push({
        clave: campo.clave,
        etiqueta: campo.etiqueta,
        tipo: campo.tipo,
        regex: campo.regex,
        minimo: campo.minimo,
        maximo: campo.maximo,
        longitud_maxima: campo.longitud_maxima,
        requerido: campo.requerido,
        placeholder: campo.placeholder,
        ayuda: campo.ayuda,
        valor_default: campo.valor_default,
        visible_tabla: campo.visible_tabla,
        ancho_grilla: campo.ancho_grilla,
        opciones,
      });
      usedEtiquetas.add(campo.etiqueta.trim().toLowerCase());
    }

    if (toCopy.length === 0) {
      return { copied: 0, skipped };
    }

    try {
      await sql.begin(async (tx) => {
        const nextRows = await tx.unsafe<{ next_orden: number }[]>(
          `SELECT COALESCE(MAX(orden), 0) + 1 AS next_orden
           FROM workflow_parte_campo_dinamico
           WHERE workflow_parte_id = $1`,
          [targetParteId],
        );
        let nextOrden = nextRows[0]?.next_orden ?? 1;

        for (const snapshot of toCopy) {
          const inserted = await tx.unsafe<{ id: string }[]>(
            `INSERT INTO workflow_parte_campo_dinamico (
               workflow_parte_id, clave, etiqueta, tipo, regex, minimo, maximo,
               longitud_maxima, requerido, placeholder, ayuda, valor_default,
               visible_tabla, ancho_grilla, orden
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
             RETURNING id`,
            [
              targetParteId,
              snapshot.clave.trim(),
              snapshot.etiqueta.trim(),
              snapshot.tipo,
              snapshot.regex,
              snapshot.minimo,
              snapshot.maximo,
              snapshot.longitud_maxima,
              snapshot.requerido,
              snapshot.placeholder,
              snapshot.ayuda,
              snapshot.valor_default,
              snapshot.visible_tabla,
              snapshot.ancho_grilla,
              nextOrden,
            ],
          );

          const campoId = inserted[0]?.id;
          if (!campoId) throw new Error("Error al copiar campos de parte");

          for (const opcion of snapshot.opciones) {
            await tx.unsafe(
              `INSERT INTO workflow_parte_campo_opcion (
                 workflow_parte_campo_dinamico_id, valor, etiqueta, orden
               ) VALUES ($1, $2, $3, $4)`,
              [
                campoId,
                opcion.valor.trim(),
                opcion.etiqueta.trim(),
                opcion.orden,
              ],
            );
          }

          nextOrden += 1;
        }
      });
    } catch (error) {
      rethrowDbError(error);
    }

    return { copied: toCopy.length, skipped };
  },

  async delete(ctx: DbContext, id: string): Promise<void> {
    const tenantId = requireTenantId(ctx);
    const rows = await queryRows<{ id: string }>(
      `DELETE FROM workflow
       WHERE id = $1
         AND tenant_id = $2
         AND origen = 'tenant'
       RETURNING id`,
      [id, tenantId],
    );

    if (!rows.length) throw new NotFoundError("Workflow no encontrado");
  },

  /**
   * TODO (EXP-001): consultar expediente.workflow_id cuando exista la columna.
   */
  async isUtilizado(_ctx: DbContext, _workflowId: string): Promise<boolean> {
    return false;
  },
};
