import type { ServerContext } from "@/lib/server/context/types";
import { requireTenantDbContext } from "@/lib/server/context/types";
import { NotFoundError } from "@/lib/server/not-found-error";
import {
  workflowRepository,
  type WorkflowCampoDinamicoSnapshot,
  type WorkflowCampoDinamicoWithOpciones,
  type WorkflowDetailGraph,
  type WorkflowListQueryRow,
} from "@/BBDD/repositories/workflow.repository";
import {
  camposDinamicosRepository,
  type CampoDinamicoDetail,
} from "@/BBDD/repositories/campos-dinamicos.repository";
import {
  WORKFLOW_CLASSIFICATION_FIELDS,
  type CloneWorkflowInput,
  type CopyWorkflowCamposFromCatalogInput,
  type CopyWorkflowCamposFromWorkflowInput,
  type CopyWorkflowParteCamposFromParteInput,
  type CreateDraftWorkflowInput,
  type CreateWorkflowEtapaInput,
  type CreateWorkflowInput,
  type CreateWorkflowCampoDinamicoInput,
  type CreateWorkflowParteCampoDinamicoInput,
  type CreateWorkflowParteInput,
  type CreateWorkflowTareaInput,
  type ReorderWorkflowCamposDinamicosInput,
  type ReorderWorkflowParteCamposDinamicosInput,
  type ReorderWorkflowEtapasInput,
  type ReorderWorkflowPartesInput,
  type ReorderWorkflowTareasInput,
  type UpdateWorkflowCampoDinamicoInput,
  type UpdateWorkflowParteCampoDinamicoInput,
  type UpdateWorkflowEtapaInput,
  type UpdateWorkflowParteInput,
  type UpdateWorkflowTareaInput,
  type WorkflowCampoDinamicoOpcionInput,
  type UpdateWorkflowInput,
  type WorkflowClassificationField,
  type WorkflowCampoDinamicoDto,
  type WorkflowCampoOpcionDto,
  type WorkflowCampoAnchoGrilla,
  type WorkflowCampoTipo,
  type WorkflowDetailDto,
  type WorkflowEtapaColor,
  type WorkflowEtapaDto,
  type WorkflowEstado,
  type WorkflowListFilters,
  type WorkflowListItemDto,
  type WorkflowOrigen,
  type WorkflowParteDto,
  type WorkflowParteCampoDinamicoDto,
  type WorkflowParteCampoOpcionDto,
  type WorkflowTareaDto,
} from "@/lib/types/workflow";
import { nowIso } from "@/BBDD/base/helpers";
import { UniqueViolationError } from "@/BBDD/base/errors";
import {
  createWorkflowCampoDinamicoSchema,
  isWorkflowCampoOptionTipo,
} from "@/lib/validation/schemas/workflow.schema";

type Ctx = ServerContext;

const CLONE_NAME_SUFFIX = " (copia)";
const MAX_COLLISION_SUFFIX_ATTEMPTS = 50;

const WORKFLOW_COMPATIBLE_CATALOG_TIPOS = new Set<WorkflowCampoTipo>([
  "text",
  "date",
  "boolean",
  "select",
  "multiselect",
]);

function normalizeCatalogTipo(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t === "fecha") return "date";
  if (t === "numero") return "number";
  if (t === "bool") return "boolean";
  return t;
}

export function mapCatalogAnchoGrillaToWorkflow(
  anchoGrilla: number,
): WorkflowCampoAnchoGrilla {
  if (anchoGrilla === 12) return 12;
  if (anchoGrilla >= 6 && anchoGrilla <= 9) return 6;
  if (anchoGrilla === 4 || anchoGrilla === 5) return 4;
  return 3;
}

function assertCatalogTipoCompatible(
  tipo: string,
  etiqueta: string,
): WorkflowCampoTipo {
  const normalized = normalizeCatalogTipo(tipo);

  if (normalized === "textarea" || normalized === "number") {
    throw new WorkflowFieldError(
      `El campo "${etiqueta}" tiene un tipo incompatible con workflow (${normalized}).`,
      "campo_dinamico_ids",
      "WORKFLOW_CAMPO_COPY_CATALOG_TIPO_INCOMPATIBLE",
    );
  }

  if (!WORKFLOW_COMPATIBLE_CATALOG_TIPOS.has(normalized as WorkflowCampoTipo)) {
    throw new WorkflowFieldError(
      `El campo "${etiqueta}" tiene un tipo incompatible con workflow (${normalized}).`,
      "campo_dinamico_ids",
      "WORKFLOW_CAMPO_COPY_CATALOG_TIPO_INCOMPATIBLE",
    );
  }

  return normalized as WorkflowCampoTipo;
}

function mapCatalogCampoToSnapshot(
  campo: CampoDinamicoDetail,
): WorkflowCampoDinamicoSnapshot {
  const tipo = assertCatalogTipoCompatible(campo.tipo, campo.etiqueta);

  const opciones = [...campo.opciones]
    .filter((opcion) => opcion.activo)
    .sort((a, b) => a.orden - b.orden || a.id.localeCompare(b.id))
    .map((opcion, index) => ({
      valor: opcion.valor,
      etiqueta: opcion.etiqueta,
      orden: index + 1,
    }));

  if (isWorkflowCampoOptionTipo(tipo) && opciones.length === 0) {
    throw new WorkflowFieldError(
      `El campo "${campo.etiqueta}" no tiene opciones activas suficientes.`,
      "campo_dinamico_ids",
      "WORKFLOW_CAMPO_COPY_CATALOG_OPCIONES_INSUFICIENTES",
    );
  }

  let valorDefault: string | null = campo.valor_default ?? null;

  if (tipo === "multiselect") {
    valorDefault = null;
  } else if (tipo === "select" && valorDefault != null && valorDefault !== "") {
    const valores = opciones.map((opcion) => opcion.valor.trim());
    if (!valores.includes(valorDefault.trim())) {
      valorDefault = null;
    }
  }

  return {
    clave: campo.clave,
    etiqueta: campo.etiqueta,
    tipo,
    regex: campo.regex,
    minimo: campo.minimo != null ? String(campo.minimo) : null,
    maximo: campo.maximo != null ? String(campo.maximo) : null,
    longitud_maxima: campo.longitud_maxima,
    requerido: campo.requerido,
    placeholder: campo.placeholder,
    ayuda: campo.ayuda,
    valor_default: valorDefault,
    visible_tabla: campo.visible_tabla,
    ancho_grilla: mapCatalogAnchoGrillaToWorkflow(campo.ancho_grilla),
    opciones,
  };
}

function orderCatalogCamposByIds(
  campos: CampoDinamicoDetail[],
  orderedIds: string[],
): CampoDinamicoDetail[] {
  const byId = new Map(campos.map((campo) => [campo.id, campo]));
  return orderedIds.map((id) => {
    const campo = byId.get(id);
    if (!campo) {
      throw new WorkflowFieldError(
        "Uno o más campos no existen en el catálogo o no están activos.",
        "campo_dinamico_ids",
        "WORKFLOW_CAMPO_COPY_CATALOG_SOURCE_NOT_FOUND",
      );
    }
    return campo;
  });
}

export function resolveCollisions(
  snapshots: WorkflowCampoDinamicoSnapshot[],
  existingClaves: Set<string>,
  existingEtiquetas: Set<string>,
): WorkflowCampoDinamicoSnapshot[] {
  const usedClaves = new Set(existingClaves);
  const usedEtiquetas = new Set(existingEtiquetas);

  return snapshots.map((snapshot) => ({
    ...snapshot,
    clave: resolveUniqueClave(snapshot.clave, usedClaves),
    etiqueta: resolveUniqueEtiqueta(snapshot.etiqueta, usedEtiquetas),
  }));
}

function resolveUniqueClave(clave: string, used: Set<string>): string {
  const base = clave.trim();
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }

  for (let suffix = 2; suffix <= MAX_COLLISION_SUFFIX_ATTEMPTS + 1; suffix += 1) {
    const suffixStr = `_${suffix}`;
    const truncatedBase =
      base.length + suffixStr.length > 100
        ? base.slice(0, 100 - suffixStr.length)
        : base;
    const candidate = `${truncatedBase}${suffixStr}`;
    if (!used.has(candidate.toLowerCase())) {
      used.add(candidate.toLowerCase());
      return candidate;
    }
  }

  throw new WorkflowFieldError(
    "No se pudo resolver una clave única para el campo copiado.",
    "clave",
    "WORKFLOW_CAMPO_COPY_RESOLUCION_CLAVE",
  );
}

function resolveUniqueEtiqueta(etiqueta: string, used: Set<string>): string {
  const base = etiqueta.trim();
  if (!used.has(base.toLowerCase())) {
    used.add(base.toLowerCase());
    return base;
  }

  for (let attempt = 1; attempt <= MAX_COLLISION_SUFFIX_ATTEMPTS; attempt += 1) {
    const candidate =
      attempt === 1 ? `${base} (copia)` : `${base} (${attempt})`;
    const normalized =
      candidate.length > 255 ? candidate.slice(0, 255) : candidate;
    if (!used.has(normalized.toLowerCase())) {
      used.add(normalized.toLowerCase());
      return normalized;
    }
  }

  throw new WorkflowFieldError(
    "No se pudo resolver una etiqueta única para el campo copiado.",
    "etiqueta",
    "WORKFLOW_CAMPO_COPY_RESOLUCION_ETIQUETA",
  );
}

function mapWorkflowCampoToSnapshot(
  campo: WorkflowCampoDinamicoWithOpciones,
): WorkflowCampoDinamicoSnapshot {
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

  return {
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
  };
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

export class WorkflowFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "WorkflowFieldError";
  }
}

function pickNombre(row: { nombre: string | null } | null | undefined): string {
  return row?.nombre?.trim() || "—";
}

function mapListRow(raw: WorkflowListQueryRow): WorkflowListItemDto {
  return {
    id: raw.id,
    origen: raw.origen as WorkflowOrigen,
    estado: raw.estado as WorkflowEstado,
    nombre: raw.nombre,
    descripcion: raw.descripcion,
    workflow_tipo_id: raw.workflow_tipo_id,
    workflow_rol_id: raw.workflow_rol_id,
    jurisdiccion_id: raw.jurisdiccion_id,
    fuero_id: raw.fuero_id,
    objeto_id: raw.objeto_id,
    tipo: { nombre: pickNombre(raw.tipo) },
    rol: { nombre: pickNombre(raw.rol) },
    jurisdiccion: { nombre: pickNombre(raw.jurisdiccion) },
    fuero: { nombre: pickNombre(raw.fuero) },
    objeto: { nombre: pickNombre(raw.objeto) },
    created_at: raw.created_at,
    updated_at: raw.updated_at,
    etapas_count: raw.etapas_count,
    partes_count: raw.partes_count,
    tareas_count: raw.tareas_count,
  };
}

function mapTarea(row: WorkflowDetailGraph["etapas"][number]["tareas"][number]): WorkflowTareaDto {
  return {
    id: row.id,
    workflow_etapa_id: row.workflow_etapa_id,
    titulo: row.titulo,
    descripcion: row.descripcion,
    obligatoria: row.obligatoria,
    orden: row.orden,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapEtapa(
  row: WorkflowDetailGraph["etapas"][number],
): WorkflowEtapaDto {
  return {
    id: row.id,
    nombre: row.nombre,
    descripcion: row.descripcion,
    color: row.color as WorkflowEtapaColor,
    orden: row.orden,
    es_inicial: row.es_inicial,
    es_final: row.es_final,
    created_at: row.created_at,
    updated_at: row.updated_at,
    tareas: (row.tareas ?? []).map(mapTarea),
  };
}

function mapParte(
  row: WorkflowDetailGraph["partes"][number],
): WorkflowParteDto {
  return {
    id: row.id,
    nombre: row.nombre,
    es_principal: row.es_principal,
    obligatoria: row.obligatoria,
    orden: row.orden,
    created_at: row.created_at,
    updated_at: row.updated_at,
    campos_dinamicos: (row.campos_dinamicos ?? []).map(mapParteCampo),
  };
}

function mapParteOpcion(
  row: WorkflowDetailGraph["partes"][number]["campos_dinamicos"][number]["opciones"][number],
): WorkflowParteCampoOpcionDto {
  return {
    id: row.id,
    valor: row.valor,
    etiqueta: row.etiqueta,
    orden: row.orden,
    created_at: row.created_at,
  };
}

function mapParteCampo(
  row: WorkflowDetailGraph["partes"][number]["campos_dinamicos"][number],
): WorkflowParteCampoDinamicoDto {
  return {
    id: row.id,
    clave: row.clave,
    etiqueta: row.etiqueta,
    tipo: row.tipo as WorkflowCampoTipo,
    regex: row.regex,
    minimo: row.minimo != null ? Number(row.minimo) : null,
    maximo: row.maximo != null ? Number(row.maximo) : null,
    longitud_maxima: row.longitud_maxima,
    requerido: row.requerido,
    placeholder: row.placeholder,
    ayuda: row.ayuda,
    valor_default: row.valor_default,
    visible_tabla: row.visible_tabla,
    ancho_grilla: row.ancho_grilla,
    orden: row.orden,
    created_at: row.created_at,
    updated_at: row.updated_at,
    opciones: (row.opciones ?? []).map(mapParteOpcion),
  };
}

function mapOpcion(
  row: WorkflowDetailGraph["campos_dinamicos"][number]["opciones"][number],
): WorkflowCampoOpcionDto {
  return {
    id: row.id,
    valor: row.valor,
    etiqueta: row.etiqueta,
    orden: row.orden,
    created_at: row.created_at,
  };
}

function mapCampo(
  row: WorkflowDetailGraph["campos_dinamicos"][number],
): WorkflowCampoDinamicoDto {
  return {
    id: row.id,
    clave: row.clave,
    etiqueta: row.etiqueta,
    tipo: row.tipo as WorkflowCampoTipo,
    regex: row.regex,
    minimo: row.minimo != null ? Number(row.minimo) : null,
    maximo: row.maximo != null ? Number(row.maximo) : null,
    longitud_maxima: row.longitud_maxima,
    requerido: row.requerido,
    placeholder: row.placeholder,
    ayuda: row.ayuda,
    valor_default: row.valor_default,
    visible_tabla: row.visible_tabla,
    ancho_grilla: row.ancho_grilla,
    orden: row.orden,
    created_at: row.created_at,
    updated_at: row.updated_at,
    opciones: (row.opciones ?? []).map(mapOpcion),
  };
}

function mapDetailGraph(
  graph: WorkflowDetailGraph,
  utilizado: boolean,
): WorkflowDetailDto {
  const editable =
    graph.origen === "tenant" &&
    graph.estado !== "archivado" &&
    !utilizado;

  return {
    id: graph.id,
    origen: graph.origen as WorkflowOrigen,
    estado: graph.estado as WorkflowEstado,
    tenant_id: graph.tenant_id,
    nombre: graph.nombre,
    descripcion: graph.descripcion,
    workflow_tipo_id: graph.workflow_tipo_id,
    workflow_rol_id: graph.workflow_rol_id,
    jurisdiccion_id: graph.jurisdiccion_id,
    fuero_id: graph.fuero_id,
    objeto_id: graph.objeto_id,
    cloned_from_workflow_id: graph.cloned_from_workflow_id,
    created_by: graph.created_by,
    created_at: graph.created_at,
    updated_by: graph.updated_by,
    updated_at: graph.updated_at,
    published_by: graph.published_by,
    published_at: graph.published_at,
    archived_by: graph.archived_by,
    archived_at: graph.archived_at,
    editable,
    utilizado,
    etapas: graph.etapas.map(mapEtapa),
    partes: graph.partes.map(mapParte),
    campos_dinamicos: graph.campos_dinamicos.map(mapCampo),
  };
}

function assertTenantWorkflowEditable(
  workflow: { origen: string; estado: string },
  utilizado: boolean,
): void {
  if (workflow.origen === "system") {
    throw new WorkflowFieldError(
      "Las plantillas JurilexIA no son editables.",
      "origen",
      "WORKFLOW_SYSTEM_READONLY",
    );
  }

  if (workflow.estado === "archivado") {
    throw new WorkflowFieldError(
      "Un workflow archivado no puede editarse.",
      "estado",
      "WORKFLOW_ARCHIVED",
    );
  }

  if (utilizado) {
    throw new WorkflowFieldError(
      "Este workflow ya fue utilizado y no puede editarse.",
      "id",
      "WORKFLOW_UTILIZADO",
    );
  }
}

function assertClassificationAtomic(input: UpdateWorkflowInput): void {
  const presentCount = WORKFLOW_CLASSIFICATION_FIELDS.filter(
    (field: WorkflowClassificationField) => input[field] !== undefined,
  ).length;

  if (
    presentCount > 0 &&
    presentCount < WORKFLOW_CLASSIFICATION_FIELDS.length
  ) {
    throw new WorkflowFieldError(
      "La clasificación debe enviarse completa.",
      "clasificacion",
      "WORKFLOW_CLASIFICACION_PARCIAL",
    );
  }
}

function assertClassificationComplete(workflow: {
  workflow_tipo_id: string | null;
  workflow_rol_id: string | null;
  jurisdiccion_id: string | null;
  fuero_id: string | null;
  objeto_id: string | null;
  nombre: string;
}): void {
  if (!workflow.nombre.trim()) {
    throw new WorkflowFieldError(
      "El nombre del workflow es obligatorio para publicar.",
      "nombre",
      "WORKFLOW_NOMBRE_REQUIRED",
    );
  }

  const requiredIds = [
    ["workflow_tipo_id", workflow.workflow_tipo_id],
    ["workflow_rol_id", workflow.workflow_rol_id],
    ["jurisdiccion_id", workflow.jurisdiccion_id],
    ["fuero_id", workflow.fuero_id],
    ["objeto_id", workflow.objeto_id],
  ] as const;

  for (const [field, value] of requiredIds) {
    if (!value?.trim()) {
      throw new WorkflowFieldError(
        "La clasificación del workflow está incompleta.",
        field,
        "WORKFLOW_CLASIFICACION_INCOMPLETA",
      );
    }
  }
}

function buildCloneName(sourceName: string, override?: string): string {
  if (override?.trim()) return override.trim();
  return `${sourceName.trim()}${CLONE_NAME_SUFFIX}`;
}

async function assertEditableWorkflow(
  ctx: Ctx,
  workflowId: string,
): Promise<void> {
  const tctx = requireTenantDbContext(ctx);
  const current = await workflowRepository.getById(tctx, workflowId);
  const utilizado = await workflowRepository.isUtilizado(tctx, workflowId);
  assertTenantWorkflowEditable(current, utilizado);
}

async function assertEtapaNombreUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  workflowId: string,
  nombre: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findEtapaByNombre(
    tctx,
    workflowId,
    nombre,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe una etapa con ese nombre en este workflow.",
      "nombre",
      "WORKFLOW_ETAPA_NOMBRE_DUPLICADO",
    );
  }
}

function mapEtapaNotFound(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new WorkflowFieldError(
      "La etapa no existe o no pertenece a este workflow.",
      "etapa_id",
      "WORKFLOW_ETAPA_NOT_FOUND",
    );
  }
  throw error;
}

function mapEtapaUniqueError(error: unknown): never {
  if (error instanceof UniqueViolationError) {
    throw new WorkflowFieldError(
      "Ya existe una etapa con ese nombre en este workflow.",
      "nombre",
      "WORKFLOW_ETAPA_NOMBRE_DUPLICADO",
    );
  }
  throw error;
}

async function assertParteNombreUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  workflowId: string,
  nombre: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findParteByNombre(
    tctx,
    workflowId,
    nombre,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe una parte con ese nombre en este workflow.",
      "nombre",
      "WORKFLOW_PARTE_NOMBRE_DUPLICADO",
    );
  }
}

function mapParteNotFound(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new WorkflowFieldError(
      "La parte no existe o no pertenece a este workflow.",
      "parte_id",
      "WORKFLOW_PARTE_NOT_FOUND",
    );
  }
  throw error;
}

function mapParteUniqueError(error: unknown): never {
  if (error instanceof UniqueViolationError) {
    throw new WorkflowFieldError(
      "Ya existe una parte con ese nombre en este workflow.",
      "nombre",
      "WORKFLOW_PARTE_NOMBRE_DUPLICADO",
    );
  }
  throw error;
}

async function assertTareaTituloUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  etapaId: string,
  titulo: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findTareaByTitulo(
    tctx,
    etapaId,
    titulo,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe una tarea con ese título en esta etapa.",
      "titulo",
      "WORKFLOW_TAREA_TITULO_DUPLICADO",
    );
  }
}

function mapTareaNotFound(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new WorkflowFieldError(
      "La tarea no existe o no pertenece a este workflow.",
      "tarea_id",
      "WORKFLOW_TAREA_NOT_FOUND",
    );
  }
  throw error;
}

function mapTareaUniqueError(error: unknown): never {
  if (error instanceof UniqueViolationError) {
    throw new WorkflowFieldError(
      "Ya existe una tarea con ese título en esta etapa.",
      "titulo",
      "WORKFLOW_TAREA_TITULO_DUPLICADO",
    );
  }
  throw error;
}

async function assertCampoDinamicoClaveUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  workflowId: string,
  clave: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findCampoDinamicoByClave(
    tctx,
    workflowId,
    clave,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe un campo con esa clave en este workflow.",
      "clave",
      "WORKFLOW_CAMPO_DINAMICO_CLAVE_DUPLICADA",
    );
  }
}

async function assertCampoDinamicoEtiquetaUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  workflowId: string,
  etiqueta: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findCampoDinamicoByEtiqueta(
    tctx,
    workflowId,
    etiqueta,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe un campo con esa etiqueta en este workflow.",
      "etiqueta",
      "WORKFLOW_CAMPO_DINAMICO_ETIQUETA_DUPLICADA",
    );
  }
}

function mapParteCampoDinamicoUniqueError(error: unknown): never {
  if (error instanceof UniqueViolationError) {
    throw new WorkflowFieldError(
      "Ya existe un campo con la misma clave o etiqueta en esta parte.",
      "clave",
      "WORKFLOW_PARTE_CAMPO_DINAMICO_CLAVE_DUPLICADA",
    );
  }
  throw error;
}

function mapParteCampoDinamicoNotFound(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new WorkflowFieldError(
      "El campo dinámico no existe o no pertenece a esta parte.",
      "campo_dinamico_id",
      "WORKFLOW_PARTE_CAMPO_DINAMICO_NOT_FOUND",
    );
  }
  throw error;
}

async function assertParteCampoDinamicoClaveUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  parteId: string,
  clave: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findParteCampoDinamicoByClave(
    tctx,
    parteId,
    clave,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe un campo con esa clave en esta parte.",
      "clave",
      "WORKFLOW_PARTE_CAMPO_DINAMICO_CLAVE_DUPLICADA",
    );
  }
}

async function assertParteCampoDinamicoEtiquetaUnique(
  tctx: ReturnType<typeof requireTenantDbContext>,
  parteId: string,
  etiqueta: string,
  excludeId?: string,
): Promise<void> {
  const dup = await workflowRepository.findParteCampoDinamicoByEtiqueta(
    tctx,
    parteId,
    etiqueta,
    excludeId,
  );

  if (dup) {
    throw new WorkflowFieldError(
      "Ya existe un campo con esa etiqueta en esta parte.",
      "etiqueta",
      "WORKFLOW_PARTE_CAMPO_DINAMICO_ETIQUETA_DUPLICADA",
    );
  }
}

function mapCampoDinamicoNotFound(error: unknown): never {
  if (error instanceof NotFoundError) {
    throw new WorkflowFieldError(
      "El campo dinámico no existe o no pertenece a este workflow.",
      "campo_dinamico_id",
      "WORKFLOW_CAMPO_DINAMICO_NOT_FOUND",
    );
  }
  throw error;
}

function mapCampoDinamicoUniqueError(error: unknown): never {
  if (error instanceof UniqueViolationError) {
    throw new WorkflowFieldError(
      "Ya existe un campo con la misma clave o etiqueta en este workflow.",
      "clave",
      "WORKFLOW_CAMPO_DINAMICO_CLAVE_DUPLICADA",
    );
  }
  throw error;
}

function normalizeCampoOpciones(
  opciones: WorkflowCampoDinamicoOpcionInput[] | undefined,
): Array<{ valor: string; etiqueta: string; orden: number }> {
  return (opciones ?? []).map((opcion, index) => ({
    valor: opcion.valor.trim(),
    etiqueta: opcion.etiqueta.trim(),
    orden: index + 1,
  }));
}

function assertCampoDinamicoBusinessRules(input: {
  tipo: WorkflowCampoTipo;
  opciones?: WorkflowCampoDinamicoOpcionInput[];
  valor_default?: string | null;
}): void {
  const parsed = createWorkflowCampoDinamicoSchema.safeParse({
    etiqueta: "validacion",
    clave: "validacion",
    tipo: input.tipo,
    requerido: false,
    visible_tabla: false,
    ancho_grilla: 12,
    opciones: input.opciones,
    valor_default: input.valor_default ?? null,
  });

  if (!parsed.success) {
    const issue = parsed.error.issues.find(
      (i) =>
        i.path[0] === "opciones" ||
        i.path[0] === "valor_default" ||
        i.path[0] === "maximo",
    );
    const field = String(issue?.path[0] ?? "tipo");
    throw new WorkflowFieldError(
      issue?.message ?? "Datos del campo dinámico inválidos.",
      field,
      field === "opciones"
        ? "WORKFLOW_CAMPO_DINAMICO_OPCIONES_REQUERIDAS"
        : field === "valor_default"
          ? "WORKFLOW_CAMPO_DINAMICO_VALOR_DEFAULT_INVALIDO"
          : "WORKFLOW_CAMPO_DINAMICO_TIPO_INVALIDO",
    );
  }
}

function buildCampoDinamicoWritePayload(input: {
  clave: string;
  etiqueta: string;
  tipo: WorkflowCampoTipo;
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
}) {
  return {
    clave: input.clave.trim(),
    etiqueta: input.etiqueta.trim(),
    tipo: input.tipo,
    regex: input.regex ?? null,
    minimo: input.minimo ?? null,
    maximo: input.maximo ?? null,
    longitud_maxima: input.longitud_maxima ?? null,
    requerido: input.requerido ?? false,
    placeholder: input.placeholder ?? null,
    ayuda: input.ayuda ?? null,
    valor_default: input.valor_default ?? null,
    visible_tabla: input.visible_tabla ?? false,
    ancho_grilla: input.ancho_grilla ?? 12,
  };
}

async function assertPartesPublishValid(
  tctx: ReturnType<typeof requireTenantDbContext>,
  workflowId: string,
): Promise<void> {
  const principalCount = await workflowRepository.countPrincipalPartes(
    tctx,
    workflowId,
  );

  if (principalCount !== 1) {
    throw new WorkflowFieldError(
      "El workflow debe tener exactamente una parte principal.",
      "partes",
      "WORKFLOW_PARTE_PRINCIPAL_REQUIRED",
    );
  }

  const principal = await workflowRepository.getPrincipalParte(tctx, workflowId);
  if (!principal?.obligatoria) {
    throw new WorkflowFieldError(
      "La parte principal del workflow debe ser obligatoria.",
      "partes",
      "WORKFLOW_PARTE_PRINCIPAL_OBLIGATORIA",
    );
  }
}

export const workflowService = {
  async list(
    ctx: Ctx,
    filters: WorkflowListFilters = {},
  ): Promise<WorkflowListItemDto[]> {
    const tctx = requireTenantDbContext(ctx);
    const rows = await workflowRepository.list(tctx, filters);
    return rows.map(mapListRow);
  },

  async getById(ctx: Ctx, id: string): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    const graph = await workflowRepository.getDetailGraph(tctx, id);
    const utilizado = await workflowRepository.isUtilizado(tctx, id);
    return mapDetailGraph(graph, utilizado);
  },

  async create(
    ctx: Ctx,
    input: CreateWorkflowInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);

    if (!input.nombre.trim()) {
      throw new WorkflowFieldError(
        "El nombre del workflow es obligatorio.",
        "nombre",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    const created = await workflowRepository.create(tctx, {
      ...input,
      descripcion: input.descripcion ?? null,
      created_by: ctx.user.id,
    });

    return this.getById(ctx, created.id);
  },

  async createDraft(
    ctx: Ctx,
    input: CreateDraftWorkflowInput = {},
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    const nombre = input.nombre?.trim() || "Nuevo workflow";

    const created = await workflowRepository.createDraft(tctx, {
      nombre,
      descripcion: input.descripcion ?? null,
      created_by: ctx.user.id,
    });

    return this.getById(ctx, created.id);
  },

  async update(
    ctx: Ctx,
    id: string,
    input: UpdateWorkflowInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    const current = await workflowRepository.getById(tctx, id);
    const utilizado = await workflowRepository.isUtilizado(tctx, id);

    assertTenantWorkflowEditable(current, utilizado);

    if (input.nombre !== undefined && !input.nombre.trim()) {
      throw new WorkflowFieldError(
        "El nombre del workflow es obligatorio.",
        "nombre",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    assertClassificationAtomic(input);

    await workflowRepository.update(tctx, id, {
      ...input,
      updated_by: ctx.user.id,
    });

    return this.getById(ctx, id);
  },

  async publish(ctx: Ctx, id: string): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    const current = await workflowRepository.getById(tctx, id);
    const utilizado = await workflowRepository.isUtilizado(tctx, id);

    assertTenantWorkflowEditable(current, utilizado);

    if (current.estado !== "borrador") {
      throw new WorkflowFieldError(
        "Solo los workflows en borrador pueden publicarse.",
        "estado",
        "WORKFLOW_NOT_BORRADOR",
      );
    }

    assertClassificationComplete(current);

    const [etapasCount, partesCount, tareasCount] = await Promise.all([
      workflowRepository.countEtapas(tctx, id),
      workflowRepository.countPartes(tctx, id),
      workflowRepository.countTareas(tctx, id),
    ]);

    if (etapasCount < 1) {
      throw new WorkflowFieldError(
        "El workflow debe tener al menos una etapa para publicarse.",
        "etapas",
        "WORKFLOW_ETAPAS_REQUIRED",
      );
    }

    if (partesCount < 1) {
      throw new WorkflowFieldError(
        "El workflow debe tener al menos una parte para publicarse.",
        "partes",
        "WORKFLOW_PARTES_REQUIRED",
      );
    }

    await assertPartesPublishValid(tctx, id);

    if (tareasCount < 1) {
      throw new WorkflowFieldError(
        "El workflow debe tener al menos una tarea para publicarse.",
        "tareas",
        "WORKFLOW_TAREAS_REQUIRED",
      );
    }

    const publishedAt = nowIso();
    await workflowRepository.setEstado(tctx, id, {
      estado: "activo",
      updated_by: ctx.user.id,
      published_by: ctx.user.id,
      published_at: publishedAt,
    });

    return this.getById(ctx, id);
  },

  async archive(ctx: Ctx, id: string): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    const current = await workflowRepository.getById(tctx, id);

    if (current.origen === "system") {
      throw new WorkflowFieldError(
        "Las plantillas JurilexIA no pueden archivarse.",
        "origen",
        "WORKFLOW_SYSTEM_READONLY",
      );
    }

    if (current.estado === "archivado") {
      throw new WorkflowFieldError(
        "El workflow ya está archivado.",
        "estado",
        "WORKFLOW_ALREADY_ARCHIVED",
      );
    }

    const archivedAt = nowIso();
    await workflowRepository.setEstado(tctx, id, {
      estado: "archivado",
      updated_by: ctx.user.id,
      archived_by: ctx.user.id,
      archived_at: archivedAt,
    });

    return this.getById(ctx, id);
  },

  async deleteWorkflow(ctx: Ctx, id: string): Promise<void> {
    const tctx = requireTenantDbContext(ctx);
    const current = await workflowRepository.getById(tctx, id);

    if (current.origen === "system") {
      throw new WorkflowFieldError(
        "Las plantillas JurilexIA no pueden eliminarse.",
        "origen",
        "WORKFLOW_SYSTEM_READONLY",
      );
    }

    const utilizado = await workflowRepository.isUtilizado(tctx, id);
    if (utilizado) {
      throw new WorkflowFieldError(
        "No se puede eliminar el workflow porque ya fue utilizado por uno o más expedientes.",
        "id",
        "WORKFLOW_DELETE_UTILIZADO",
      );
    }

    await workflowRepository.delete(tctx, id);
  },

  async clone(
    ctx: Ctx,
    input: CloneWorkflowInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);

    let source;
    try {
      source = await workflowRepository.getById(tctx, input.source_workflow_id);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new WorkflowFieldError(
          "El workflow origen no existe o no está disponible.",
          "source_workflow_id",
          "WORKFLOW_SOURCE_NOT_FOUND",
        );
      }
      throw error;
    }

    const nombre = buildCloneName(source.nombre, input.nombre);
    const newId = await workflowRepository.cloneDeep(tctx, source.id, {
      nombre,
      created_by: ctx.user.id,
    });

    return this.getById(ctx, newId);
  },

  async createEtapa(
    ctx: Ctx,
    workflowId: string,
    input: CreateWorkflowEtapaInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    if (!input.nombre.trim()) {
      throw new WorkflowFieldError(
        "El nombre de la etapa es obligatorio.",
        "nombre",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    await assertEtapaNombreUnique(tctx, workflowId, input.nombre);

    try {
      await workflowRepository.createEtapa(tctx, workflowId, {
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        color: input.color ?? "primary",
      });
    } catch (error) {
      mapEtapaUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async updateEtapa(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
    input: UpdateWorkflowEtapaInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getEtapaById(tctx, workflowId, etapaId);
    } catch (error) {
      mapEtapaNotFound(error);
    }

    if (input.nombre !== undefined) {
      if (!input.nombre.trim()) {
        throw new WorkflowFieldError(
          "El nombre de la etapa es obligatorio.",
          "nombre",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }

      await assertEtapaNombreUnique(tctx, workflowId, input.nombre, etapaId);
    }

    try {
      await workflowRepository.updateEtapa(tctx, workflowId, etapaId, {
        nombre: input.nombre,
        descripcion: input.descripcion,
        color: input.color,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        mapEtapaNotFound(error);
      }
      mapEtapaUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async deleteEtapa(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    const etapasCount = await workflowRepository.countEtapas(tctx, workflowId);
    if (etapasCount <= 1) {
      throw new WorkflowFieldError(
        "El workflow debe tener al menos una etapa.",
        "etapas",
        "WORKFLOW_ETAPA_MIN_ONE",
      );
    }

    try {
      await workflowRepository.getEtapaById(tctx, workflowId, etapaId);
    } catch (error) {
      mapEtapaNotFound(error);
    }

    try {
      await workflowRepository.deleteEtapa(tctx, workflowId, etapaId);
    } catch (error) {
      mapEtapaNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async reorderEtapas(
    ctx: Ctx,
    workflowId: string,
    input: ReorderWorkflowEtapasInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.reorderEtapas(
        tctx,
        workflowId,
        input.etapa_ids,
      );
    } catch (error) {
      if (error instanceof UniqueViolationError) {
        console.error("[workflowService.reorderEtapas] UniqueViolationError", {
          code: error.code,
          constraint: error.constraint,
          detail: error.detail,
          message: error.message,
          stack: error.stack,
        });
        throw new WorkflowFieldError(
          "No se pudo reordenar las etapas.",
          "etapa_ids",
          "WORKFLOW_ETAPA_REORDER_CONFLICT",
        );
      }
      if (error instanceof NotFoundError) {
        mapEtapaNotFound(error);
      }
      throw error;
    }

    return this.getById(ctx, workflowId);
  },

  async createTarea(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
    input: CreateWorkflowTareaInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getEtapaById(tctx, workflowId, etapaId);
    } catch (error) {
      mapEtapaNotFound(error);
    }

    if (!input.titulo.trim()) {
      throw new WorkflowFieldError(
        "El título de la tarea es obligatorio.",
        "titulo",
        "WORKFLOW_TITULO_REQUIRED",
      );
    }

    await assertTareaTituloUnique(tctx, etapaId, input.titulo);

    try {
      await workflowRepository.createTarea(tctx, etapaId, {
        titulo: input.titulo,
        descripcion: input.descripcion ?? null,
        obligatoria: input.obligatoria ?? false,
      });
    } catch (error) {
      mapTareaUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async updateTarea(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
    tareaId: string,
    input: UpdateWorkflowTareaInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getTareaById(tctx, workflowId, etapaId, tareaId);
    } catch (error) {
      mapTareaNotFound(error);
    }

    if (input.titulo !== undefined) {
      if (!input.titulo.trim()) {
        throw new WorkflowFieldError(
          "El título de la tarea es obligatorio.",
          "titulo",
          "WORKFLOW_TITULO_REQUIRED",
        );
      }

      await assertTareaTituloUnique(tctx, etapaId, input.titulo, tareaId);
    }

    try {
      await workflowRepository.updateTarea(tctx, workflowId, etapaId, tareaId, {
        titulo: input.titulo,
        descripcion: input.descripcion,
        obligatoria: input.obligatoria,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        mapTareaNotFound(error);
      }
      mapTareaUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async deleteTarea(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
    tareaId: string,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getTareaById(tctx, workflowId, etapaId, tareaId);
    } catch (error) {
      mapTareaNotFound(error);
    }

    try {
      await workflowRepository.deleteTarea(tctx, workflowId, etapaId, tareaId);
    } catch (error) {
      mapTareaNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async reorderTareas(
    ctx: Ctx,
    workflowId: string,
    etapaId: string,
    input: ReorderWorkflowTareasInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getEtapaById(tctx, workflowId, etapaId);
    } catch (error) {
      mapEtapaNotFound(error);
    }

    try {
      await workflowRepository.reorderTareas(
        tctx,
        workflowId,
        etapaId,
        input.tarea_ids,
      );
    } catch (error) {
      mapTareaNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async createParte(
    ctx: Ctx,
    workflowId: string,
    input: CreateWorkflowParteInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    if (!input.nombre.trim()) {
      throw new WorkflowFieldError(
        "El nombre de la parte es obligatorio.",
        "nombre",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    await assertParteNombreUnique(tctx, workflowId, input.nombre);

    try {
      await workflowRepository.createParte(tctx, workflowId, {
        nombre: input.nombre,
        es_principal: input.es_principal ?? false,
        obligatoria: input.obligatoria ?? false,
      });
    } catch (error) {
      mapParteUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async updateParte(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
    input: UpdateWorkflowParteInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    let current;
    try {
      current = await workflowRepository.getParteById(tctx, workflowId, parteId);
    } catch (error) {
      mapParteNotFound(error);
    }

    if (input.es_principal === false && current.es_principal) {
      throw new WorkflowFieldError(
        "Marcá otra parte como principal antes de quitarle ese rol.",
        "es_principal",
        "WORKFLOW_PARTE_PRINCIPAL_REQUIRED",
      );
    }

    const willBePrincipal =
      input.es_principal === true ||
      (input.es_principal === undefined && current.es_principal);

    if (input.obligatoria === false && willBePrincipal) {
      throw new WorkflowFieldError(
        "La parte principal siempre debe ser obligatoria.",
        "obligatoria",
        "WORKFLOW_PARTE_PRINCIPAL_OBLIGATORIA",
      );
    }

    if (input.nombre !== undefined) {
      if (!input.nombre.trim()) {
        throw new WorkflowFieldError(
          "El nombre de la parte es obligatorio.",
          "nombre",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }

      await assertParteNombreUnique(tctx, workflowId, input.nombre, parteId);
    }

    try {
      await workflowRepository.updateParte(tctx, workflowId, parteId, {
        nombre: input.nombre,
        es_principal: input.es_principal,
        obligatoria: input.obligatoria,
      });
    } catch (error) {
      if (error instanceof NotFoundError) {
        mapParteNotFound(error);
      }
      mapParteUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async deleteParte(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    const partesCount = await workflowRepository.countPartes(tctx, workflowId);
    if (partesCount <= 1) {
      throw new WorkflowFieldError(
        "El workflow debe tener al menos una parte.",
        "partes",
        "WORKFLOW_PARTE_MIN_ONE",
      );
    }

    let current;
    try {
      current = await workflowRepository.getParteById(tctx, workflowId, parteId);
    } catch (error) {
      mapParteNotFound(error);
    }

    if (current.es_principal) {
      throw new WorkflowFieldError(
        "No podés eliminar la parte principal. Marcá otra como principal primero.",
        "parte_id",
        "WORKFLOW_PARTE_PRINCIPAL_DELETE",
      );
    }

    try {
      await workflowRepository.deleteParte(tctx, workflowId, parteId);
    } catch (error) {
      mapParteNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async reorderPartes(
    ctx: Ctx,
    workflowId: string,
    input: ReorderWorkflowPartesInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.reorderPartes(
        tctx,
        workflowId,
        input.parte_ids,
      );
    } catch (error) {
      mapParteNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async createCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    input: CreateWorkflowCampoDinamicoInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    if (!input.etiqueta.trim()) {
      throw new WorkflowFieldError(
        "La etiqueta del campo es obligatoria.",
        "etiqueta",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    if (!input.clave.trim()) {
      throw new WorkflowFieldError(
        "La clave del campo es obligatoria.",
        "clave",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    const opciones = isWorkflowCampoOptionTipo(input.tipo)
      ? normalizeCampoOpciones(input.opciones)
      : [];

    assertCampoDinamicoBusinessRules({
      tipo: input.tipo,
      opciones: input.opciones,
      valor_default: input.valor_default ?? null,
    });

    await assertCampoDinamicoClaveUnique(tctx, workflowId, input.clave);
    await assertCampoDinamicoEtiquetaUnique(tctx, workflowId, input.etiqueta);

    try {
      await workflowRepository.createCampoDinamico(
        tctx,
        workflowId,
        buildCampoDinamicoWritePayload(input),
        opciones,
      );
    } catch (error) {
      mapCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async updateCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    campoDinamicoId: string,
    input: UpdateWorkflowCampoDinamicoInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    let current;
    try {
      current = await workflowRepository.getCampoDinamicoById(
        tctx,
        workflowId,
        campoDinamicoId,
      );
    } catch (error) {
      mapCampoDinamicoNotFound(error);
    }

    const effectiveTipo = (input.tipo ?? current.tipo) as WorkflowCampoTipo;

    let effectiveOpcionesInput: WorkflowCampoDinamicoOpcionInput[] | undefined;
    if (input.opciones !== undefined) {
      effectiveOpcionesInput = input.opciones;
    } else if (isWorkflowCampoOptionTipo(effectiveTipo)) {
      const existingOpciones = await workflowRepository.listCampoDinamicoOpciones(
        tctx,
        campoDinamicoId,
      );
      effectiveOpcionesInput = existingOpciones.map((opcion) => ({
        etiqueta: opcion.etiqueta,
        valor: opcion.valor,
        orden: opcion.orden,
      }));
    }

    const effectiveValorDefault =
      input.valor_default !== undefined
        ? input.valor_default
        : current.valor_default;

    if (effectiveTipo === "multiselect") {
      if (input.valor_default !== undefined && input.valor_default !== null) {
        assertCampoDinamicoBusinessRules({
          tipo: effectiveTipo,
          opciones: effectiveOpcionesInput,
          valor_default: input.valor_default,
        });
      }
    } else {
      assertCampoDinamicoBusinessRules({
        tipo: effectiveTipo,
        opciones: effectiveOpcionesInput,
        valor_default: effectiveValorDefault,
      });
    }

    if (input.clave !== undefined) {
      if (!input.clave.trim()) {
        throw new WorkflowFieldError(
          "La clave del campo es obligatoria.",
          "clave",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }
      await assertCampoDinamicoClaveUnique(
        tctx,
        workflowId,
        input.clave,
        campoDinamicoId,
      );
    }

    if (input.etiqueta !== undefined) {
      if (!input.etiqueta.trim()) {
        throw new WorkflowFieldError(
          "La etiqueta del campo es obligatoria.",
          "etiqueta",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }
      await assertCampoDinamicoEtiquetaUnique(
        tctx,
        workflowId,
        input.etiqueta,
        campoDinamicoId,
      );
    }

    const writePayload: Parameters<
      typeof workflowRepository.updateCampoDinamico
    >[3] = {};

    if (input.clave !== undefined) writePayload.clave = input.clave;
    if (input.etiqueta !== undefined) writePayload.etiqueta = input.etiqueta;
    if (input.tipo !== undefined) writePayload.tipo = input.tipo;
    if (input.regex !== undefined) writePayload.regex = input.regex;
    if (input.minimo !== undefined) writePayload.minimo = input.minimo;
    if (input.maximo !== undefined) writePayload.maximo = input.maximo;
    if (input.longitud_maxima !== undefined) {
      writePayload.longitud_maxima = input.longitud_maxima;
    }
    if (input.requerido !== undefined) writePayload.requerido = input.requerido;
    if (input.placeholder !== undefined) {
      writePayload.placeholder = input.placeholder;
    }
    if (input.ayuda !== undefined) writePayload.ayuda = input.ayuda;
    if (input.valor_default !== undefined) {
      writePayload.valor_default = input.valor_default;
    } else if (effectiveTipo === "multiselect" && current.valor_default) {
      writePayload.valor_default = null;
    }
    if (input.visible_tabla !== undefined) {
      writePayload.visible_tabla = input.visible_tabla;
    }
    if (input.ancho_grilla !== undefined) {
      writePayload.ancho_grilla = input.ancho_grilla;
    }

    let opcionesUpdate: Array<{
      valor: string;
      etiqueta: string;
      orden: number;
    }> | null | undefined;

    if (input.opciones !== undefined) {
      opcionesUpdate = isWorkflowCampoOptionTipo(effectiveTipo)
        ? normalizeCampoOpciones(input.opciones)
        : [];
    } else if (input.tipo !== undefined && !isWorkflowCampoOptionTipo(input.tipo)) {
      opcionesUpdate = [];
    }

    try {
      await workflowRepository.updateCampoDinamico(
        tctx,
        workflowId,
        campoDinamicoId,
        writePayload,
        opcionesUpdate,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        mapCampoDinamicoNotFound(error);
      }
      mapCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async deleteCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    campoDinamicoId: string,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.deleteCampoDinamico(
        tctx,
        workflowId,
        campoDinamicoId,
      );
    } catch (error) {
      mapCampoDinamicoNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async reorderCamposDinamicos(
    ctx: Ctx,
    workflowId: string,
    input: ReorderWorkflowCamposDinamicosInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    const uniqueIds = new Set(input.campo_dinamico_ids);
    if (uniqueIds.size !== input.campo_dinamico_ids.length) {
      throw new WorkflowFieldError(
        "La lista de IDs no puede contener repetidos.",
        "campo_dinamico_ids",
        "WORKFLOW_CAMPO_DINAMICO_REORDER_INVALIDO",
      );
    }

    const count = await workflowRepository.countCamposDinamicos(
      tctx,
      workflowId,
    );

    if (input.campo_dinamico_ids.length !== count) {
      throw new WorkflowFieldError(
        "La lista de IDs debe incluir todos los campos del workflow.",
        "campo_dinamico_ids",
        "WORKFLOW_CAMPO_DINAMICO_REORDER_INVALIDO",
      );
    }

    try {
      await workflowRepository.reorderCamposDinamicos(
        tctx,
        workflowId,
        input.campo_dinamico_ids,
      );
    } catch (error) {
      if (error instanceof UniqueViolationError) {
        console.error(
          "[workflowService.reorderCamposDinamicos] UniqueViolationError",
          {
            code: error.code,
            constraint: error.constraint,
            detail: error.detail,
            message: error.message,
            stack: error.stack,
          },
        );
      }
      mapCampoDinamicoNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async copyCamposFromWorkflow(
    ctx: Ctx,
    workflowId: string,
    input: CopyWorkflowCamposFromWorkflowInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    const campoIds =
      input.campo_dinamico_ids !== undefined
        ? dedupeIds(input.campo_dinamico_ids)
        : undefined;

    if (campoIds !== undefined && campoIds.length === 0) {
      throw new WorkflowFieldError(
        "Seleccioná al menos un campo para copiar.",
        "campo_dinamico_ids",
        "WORKFLOW_CAMPO_COPY_IDS_REQUERIDOS",
      );
    }

    let sourceCampos: WorkflowCampoDinamicoWithOpciones[];
    try {
      sourceCampos = await workflowRepository.listCamposDinamicosWithOpciones(
        tctx,
        input.source_workflow_id,
        campoIds,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        if (campoIds !== undefined) {
          throw new WorkflowFieldError(
            "Uno o más campos no existen en el workflow origen.",
            "campo_dinamico_ids",
            "WORKFLOW_CAMPO_COPY_SOURCE_CAMPO_NOT_FOUND",
          );
        }
        throw new WorkflowFieldError(
          "El workflow origen no existe o no está disponible.",
          "source_workflow_id",
          "WORKFLOW_CAMPO_COPY_SOURCE_NOT_FOUND",
        );
      }
      throw error;
    }

    if (sourceCampos.length === 0) {
      throw new WorkflowFieldError(
        "El workflow origen no tiene campos dinámicos para copiar.",
        "source_workflow_id",
        "WORKFLOW_CAMPO_COPY_SOURCE_SIN_CAMPOS",
      );
    }

    const snapshots = sourceCampos.map(mapWorkflowCampoToSnapshot);

    for (const snapshot of snapshots) {
      const opcionesInput = isWorkflowCampoOptionTipo(snapshot.tipo)
        ? snapshot.opciones.map((opcion) => ({
            etiqueta: opcion.etiqueta,
            valor: opcion.valor,
            orden: opcion.orden,
          }))
        : undefined;

      assertCampoDinamicoBusinessRules({
        tipo: snapshot.tipo as WorkflowCampoTipo,
        opciones: opcionesInput,
        valor_default: snapshot.valor_default,
      });
    }

    const existing = await workflowRepository.listTargetCampoClavesEtiquetas(
      tctx,
      workflowId,
    );
    const resolvedSnapshots = resolveCollisions(
      snapshots,
      new Set(existing.claves),
      new Set(existing.etiquetas),
    );

    try {
      await workflowRepository.appendCamposDinamicosSnapshot(
        tctx,
        workflowId,
        resolvedSnapshots,
      );
    } catch (error) {
      mapCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async copyCamposFromCatalog(
    ctx: Ctx,
    workflowId: string,
    input: CopyWorkflowCamposFromCatalogInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    const campoIds = dedupeIds(input.campo_dinamico_ids);

    if (campoIds.length === 0) {
      throw new WorkflowFieldError(
        "Seleccioná al menos un campo para copiar.",
        "campo_dinamico_ids",
        "WORKFLOW_CAMPO_COPY_CATALOG_IDS_REQUERIDOS",
      );
    }

    let sourceCampos: CampoDinamicoDetail[];
    try {
      sourceCampos = await camposDinamicosRepository.listActiveWithOpcionesByContexto(
        tctx,
        input.contexto,
        campoIds,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new WorkflowFieldError(
          "Uno o más campos no existen en el catálogo o no están activos.",
          "campo_dinamico_ids",
          "WORKFLOW_CAMPO_COPY_CATALOG_SOURCE_NOT_FOUND",
        );
      }
      throw error;
    }

    const orderedCampos = orderCatalogCamposByIds(sourceCampos, campoIds);
    const snapshots = orderedCampos.map(mapCatalogCampoToSnapshot);

    for (const snapshot of snapshots) {
      const opcionesInput = isWorkflowCampoOptionTipo(snapshot.tipo)
        ? snapshot.opciones.map((opcion) => ({
            etiqueta: opcion.etiqueta,
            valor: opcion.valor,
            orden: opcion.orden,
          }))
        : undefined;

      assertCampoDinamicoBusinessRules({
        tipo: snapshot.tipo as WorkflowCampoTipo,
        opciones: opcionesInput,
        valor_default: snapshot.valor_default,
      });
    }

    const existing = await workflowRepository.listTargetCampoClavesEtiquetas(
      tctx,
      workflowId,
    );
    const resolvedSnapshots = resolveCollisions(
      snapshots,
      new Set(existing.claves),
      new Set(existing.etiquetas),
    );

    try {
      await workflowRepository.appendCamposDinamicosSnapshot(
        tctx,
        workflowId,
        resolvedSnapshots,
      );
    } catch (error) {
      mapCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async createParteCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
    input: CreateWorkflowParteCampoDinamicoInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.getParteById(tctx, workflowId, parteId);
    } catch (error) {
      mapParteNotFound(error);
    }

    if (!input.etiqueta.trim()) {
      throw new WorkflowFieldError(
        "La etiqueta del campo es obligatoria.",
        "etiqueta",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    if (!input.clave.trim()) {
      throw new WorkflowFieldError(
        "La clave del campo es obligatoria.",
        "clave",
        "WORKFLOW_NOMBRE_REQUIRED",
      );
    }

    const opciones = isWorkflowCampoOptionTipo(input.tipo)
      ? normalizeCampoOpciones(input.opciones)
      : [];

    assertCampoDinamicoBusinessRules({
      tipo: input.tipo,
      opciones: input.opciones,
      valor_default: input.valor_default ?? null,
    });

    await assertParteCampoDinamicoClaveUnique(tctx, parteId, input.clave);
    await assertParteCampoDinamicoEtiquetaUnique(tctx, parteId, input.etiqueta);

    try {
      await workflowRepository.createParteCampoDinamico(
        tctx,
        parteId,
        buildCampoDinamicoWritePayload(input),
        opciones,
      );
    } catch (error) {
      mapParteCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async updateParteCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
    campoDinamicoId: string,
    input: UpdateWorkflowParteCampoDinamicoInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    let current;
    try {
      current = await workflowRepository.getParteCampoDinamicoById(
        tctx,
        workflowId,
        parteId,
        campoDinamicoId,
      );
    } catch (error) {
      mapParteCampoDinamicoNotFound(error);
    }

    const effectiveTipo = (input.tipo ?? current.tipo) as WorkflowCampoTipo;

    let effectiveOpcionesInput: WorkflowCampoDinamicoOpcionInput[] | undefined;
    if (input.opciones !== undefined) {
      effectiveOpcionesInput = input.opciones;
    } else if (isWorkflowCampoOptionTipo(effectiveTipo)) {
      const existingOpciones =
        await workflowRepository.listParteCampoDinamicoOpciones(
          tctx,
          campoDinamicoId,
        );
      effectiveOpcionesInput = existingOpciones.map((opcion) => ({
        etiqueta: opcion.etiqueta,
        valor: opcion.valor,
        orden: opcion.orden,
      }));
    }

    const effectiveValorDefault =
      input.valor_default !== undefined
        ? input.valor_default
        : current.valor_default;

    if (effectiveTipo === "multiselect") {
      if (input.valor_default !== undefined && input.valor_default !== null) {
        assertCampoDinamicoBusinessRules({
          tipo: effectiveTipo,
          opciones: effectiveOpcionesInput,
          valor_default: input.valor_default,
        });
      }
    } else {
      assertCampoDinamicoBusinessRules({
        tipo: effectiveTipo,
        opciones: effectiveOpcionesInput,
        valor_default: effectiveValorDefault,
      });
    }

    if (input.clave !== undefined) {
      if (!input.clave.trim()) {
        throw new WorkflowFieldError(
          "La clave del campo es obligatoria.",
          "clave",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }
      await assertParteCampoDinamicoClaveUnique(
        tctx,
        parteId,
        input.clave,
        campoDinamicoId,
      );
    }

    if (input.etiqueta !== undefined) {
      if (!input.etiqueta.trim()) {
        throw new WorkflowFieldError(
          "La etiqueta del campo es obligatoria.",
          "etiqueta",
          "WORKFLOW_NOMBRE_REQUIRED",
        );
      }
      await assertParteCampoDinamicoEtiquetaUnique(
        tctx,
        parteId,
        input.etiqueta,
        campoDinamicoId,
      );
    }

    const writePayload: Parameters<
      typeof workflowRepository.updateParteCampoDinamico
    >[4] = {};

    if (input.clave !== undefined) writePayload.clave = input.clave;
    if (input.etiqueta !== undefined) writePayload.etiqueta = input.etiqueta;
    if (input.tipo !== undefined) writePayload.tipo = input.tipo;
    if (input.regex !== undefined) writePayload.regex = input.regex;
    if (input.minimo !== undefined) writePayload.minimo = input.minimo;
    if (input.maximo !== undefined) writePayload.maximo = input.maximo;
    if (input.longitud_maxima !== undefined) {
      writePayload.longitud_maxima = input.longitud_maxima;
    }
    if (input.requerido !== undefined) writePayload.requerido = input.requerido;
    if (input.placeholder !== undefined) {
      writePayload.placeholder = input.placeholder;
    }
    if (input.ayuda !== undefined) writePayload.ayuda = input.ayuda;
    if (input.valor_default !== undefined) {
      writePayload.valor_default = input.valor_default;
    } else if (effectiveTipo === "multiselect" && current.valor_default) {
      writePayload.valor_default = null;
    }
    if (input.visible_tabla !== undefined) {
      writePayload.visible_tabla = input.visible_tabla;
    }
    if (input.ancho_grilla !== undefined) {
      writePayload.ancho_grilla = input.ancho_grilla;
    }

    let opcionesUpdate: Array<{
      valor: string;
      etiqueta: string;
      orden: number;
    }> | null | undefined;

    if (input.opciones !== undefined) {
      opcionesUpdate = isWorkflowCampoOptionTipo(effectiveTipo)
        ? normalizeCampoOpciones(input.opciones)
        : [];
    } else if (input.tipo !== undefined && !isWorkflowCampoOptionTipo(input.tipo)) {
      opcionesUpdate = [];
    }

    try {
      await workflowRepository.updateParteCampoDinamico(
        tctx,
        workflowId,
        parteId,
        campoDinamicoId,
        writePayload,
        opcionesUpdate,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        mapParteCampoDinamicoNotFound(error);
      }
      mapParteCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },

  async deleteParteCampoDinamico(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
    campoDinamicoId: string,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.deleteParteCampoDinamico(
        tctx,
        workflowId,
        parteId,
        campoDinamicoId,
      );
    } catch (error) {
      mapParteCampoDinamicoNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async reorderParteCamposDinamicos(
    ctx: Ctx,
    workflowId: string,
    parteId: string,
    input: ReorderWorkflowParteCamposDinamicosInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    try {
      await workflowRepository.reorderParteCamposDinamicos(
        tctx,
        workflowId,
        parteId,
        input.campo_dinamico_ids,
      );
    } catch (error) {
      mapParteCampoDinamicoNotFound(error);
    }

    return this.getById(ctx, workflowId);
  },

  async copyParteCamposFromParte(
    ctx: Ctx,
    workflowId: string,
    targetParteId: string,
    input: CopyWorkflowParteCamposFromParteInput,
  ): Promise<WorkflowDetailDto> {
    const tctx = requireTenantDbContext(ctx);
    await assertEditableWorkflow(ctx, workflowId);

    if (targetParteId === input.sourceParteId) {
      throw new WorkflowFieldError(
        "La parte origen debe ser distinta de la parte destino.",
        "sourceParteId",
        "WORKFLOW_PARTE_CAMPO_COPY_MISMA_PARTE",
      );
    }

    try {
      await workflowRepository.getParteById(tctx, workflowId, targetParteId);
      await workflowRepository.getParteById(tctx, workflowId, input.sourceParteId);
    } catch (error) {
      mapParteNotFound(error);
    }

    const sourceCampos = await workflowRepository.listParteCamposDinamicosWithOpciones(
      tctx,
      workflowId,
      input.sourceParteId,
    );

    if (sourceCampos.length === 0) {
      throw new WorkflowFieldError(
        "La parte origen no tiene campos dinámicos para copiar.",
        "sourceParteId",
        "WORKFLOW_PARTE_CAMPO_COPY_SOURCE_SIN_CAMPOS",
      );
    }

    for (const campo of sourceCampos) {
      const opcionesInput = isWorkflowCampoOptionTipo(campo.tipo)
        ? campo.opciones.map((opcion) => ({
            etiqueta: opcion.etiqueta,
            valor: opcion.valor,
            orden: opcion.orden,
          }))
        : undefined;

      assertCampoDinamicoBusinessRules({
        tipo: campo.tipo as WorkflowCampoTipo,
        opciones: opcionesInput,
        valor_default: campo.valor_default,
      });
    }

    try {
      await workflowRepository.copyParteCamposFromParte(
        tctx,
        workflowId,
        targetParteId,
        input.sourceParteId,
      );
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new WorkflowFieldError(
          "La parte origen no tiene campos dinámicos para copiar.",
          "sourceParteId",
          "WORKFLOW_PARTE_CAMPO_COPY_SOURCE_SIN_CAMPOS",
        );
      }
      mapParteCampoDinamicoUniqueError(error);
    }

    return this.getById(ctx, workflowId);
  },
};
