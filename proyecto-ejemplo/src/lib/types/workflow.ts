export const WORKFLOW_ORIGEN = ["system", "tenant"] as const;
export type WorkflowOrigen = (typeof WORKFLOW_ORIGEN)[number];

export const WORKFLOW_ESTADO = ["borrador", "activo", "archivado"] as const;
export type WorkflowEstado = (typeof WORKFLOW_ESTADO)[number];

export const WORKFLOW_ETAPA_COLORES = [
  "primary",
  "success",
  "warning",
  "danger",
  "neutral",
] as const;
export type WorkflowEtapaColor = (typeof WORKFLOW_ETAPA_COLORES)[number];

export const WORKFLOW_CAMPO_TIPOS = [
  "text",
  "select",
  "multiselect",
  "date",
  "boolean",
] as const;
export type WorkflowCampoTipo = (typeof WORKFLOW_CAMPO_TIPOS)[number];

export type WorkflowCatalogoRef = {
  id: string;
  nombre: string;
};

export const WORKFLOW_CLASSIFICATION_FIELDS = [
  "workflow_tipo_id",
  "workflow_rol_id",
  "jurisdiccion_id",
  "fuero_id",
  "objeto_id",
] as const;

export type WorkflowClassificationField =
  (typeof WORKFLOW_CLASSIFICATION_FIELDS)[number];

export type WorkflowListItemDto = {
  id: string;
  origen: WorkflowOrigen;
  estado: WorkflowEstado;
  nombre: string;
  descripcion: string | null;
  workflow_tipo_id: string | null;
  workflow_rol_id: string | null;
  jurisdiccion_id: string | null;
  fuero_id: string | null;
  objeto_id: string | null;
  tipo: { nombre: string };
  rol: { nombre: string };
  jurisdiccion: { nombre: string };
  fuero: { nombre: string };
  objeto: { nombre: string };
  created_at: string;
  updated_at: string;
  etapas_count: number;
  partes_count: number;
  tareas_count: number;
};

export type WorkflowListFilters = {
  origen?: WorkflowOrigen;
  estado?: WorkflowEstado;
  workflow_tipo_id?: string;
  q?: string;
};

export type WorkflowTareaDto = {
  id: string;
  workflow_etapa_id: string;
  titulo: string;
  descripcion: string | null;
  obligatoria: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
};

export type WorkflowEtapaDto = {
  id: string;
  nombre: string;
  descripcion: string | null;
  color: WorkflowEtapaColor;
  orden: number;
  es_inicial: boolean;
  es_final: boolean;
  created_at: string;
  updated_at: string;
  tareas: WorkflowTareaDto[];
};

export type WorkflowParteCampoOpcionDto = {
  id: string;
  valor: string;
  etiqueta: string;
  orden: number;
  created_at: string;
};

export type WorkflowParteCampoDinamicoDto = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: WorkflowCampoTipo;
  regex: string | null;
  minimo: number | null;
  maximo: number | null;
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
  opciones: WorkflowParteCampoOpcionDto[];
};

export type WorkflowParteDto = {
  id: string;
  nombre: string;
  es_principal: boolean;
  obligatoria: boolean;
  orden: number;
  created_at: string;
  updated_at: string;
  campos_dinamicos: WorkflowParteCampoDinamicoDto[];
};

export type WorkflowCampoOpcionDto = {
  id: string;
  valor: string;
  etiqueta: string;
  orden: number;
  created_at: string;
};

export type WorkflowCampoDinamicoDto = {
  id: string;
  clave: string;
  etiqueta: string;
  tipo: WorkflowCampoTipo;
  regex: string | null;
  minimo: number | null;
  maximo: number | null;
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
  opciones: WorkflowCampoOpcionDto[];
};

export type WorkflowDetailDto = {
  id: string;
  origen: WorkflowOrigen;
  estado: WorkflowEstado;
  tenant_id: string | null;
  nombre: string;
  descripcion: string | null;
  workflow_tipo_id: string | null;
  workflow_rol_id: string | null;
  jurisdiccion_id: string | null;
  fuero_id: string | null;
  objeto_id: string | null;
  cloned_from_workflow_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_by: string | null;
  updated_at: string;
  published_by: string | null;
  published_at: string | null;
  archived_by: string | null;
  archived_at: string | null;
  editable: boolean;
  utilizado: boolean;
  etapas: WorkflowEtapaDto[];
  partes: WorkflowParteDto[];
  campos_dinamicos: WorkflowCampoDinamicoDto[];
};

export type CreateWorkflowInput = {
  workflow_tipo_id: string;
  workflow_rol_id: string;
  jurisdiccion_id: string;
  fuero_id: string;
  objeto_id: string;
  nombre: string;
  descripcion?: string | null;
};

export type CreateDraftWorkflowInput = {
  nombre?: string;
  descripcion?: string | null;
};

export type UpdateWorkflowInput = Partial<CreateWorkflowInput>;

export type CloneWorkflowInput = {
  source_workflow_id: string;
  nombre?: string;
};

export type CreateWorkflowEtapaInput = {
  nombre: string;
  descripcion?: string | null;
  color?: WorkflowEtapaColor;
};

export type UpdateWorkflowEtapaInput = Partial<CreateWorkflowEtapaInput>;

export type ReorderWorkflowEtapasInput = {
  etapa_ids: string[];
};

export type CreateWorkflowParteInput = {
  nombre: string;
  es_principal?: boolean;
  obligatoria?: boolean;
};

export type UpdateWorkflowParteInput = Partial<CreateWorkflowParteInput>;

export type ReorderWorkflowPartesInput = {
  parte_ids: string[];
};

export type CreateWorkflowTareaInput = {
  titulo: string;
  descripcion?: string | null;
  obligatoria?: boolean;
};

export type UpdateWorkflowTareaInput = Partial<CreateWorkflowTareaInput>;

export type ReorderWorkflowTareasInput = {
  tarea_ids: string[];
};

export const WORKFLOW_CAMPO_ANCHO_GRILLA = [12, 6, 4, 3] as const;
export type WorkflowCampoAnchoGrilla =
  (typeof WORKFLOW_CAMPO_ANCHO_GRILLA)[number];

export type WorkflowCampoDinamicoOpcionInput = {
  etiqueta: string;
  valor: string;
  orden?: number;
};

export type CreateWorkflowCampoDinamicoInput = {
  etiqueta: string;
  clave: string;
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
  ancho_grilla?: WorkflowCampoAnchoGrilla;
  opciones?: WorkflowCampoDinamicoOpcionInput[];
};

export type UpdateWorkflowCampoDinamicoInput =
  Partial<CreateWorkflowCampoDinamicoInput>;

export type ReorderWorkflowCamposDinamicosInput = {
  campo_dinamico_ids: string[];
};

export type CopyWorkflowCamposFromWorkflowInput = {
  source_workflow_id: string;
  campo_dinamico_ids?: string[];
};

export type CopyWorkflowCamposFromCatalogContexto = "caso" | "expediente";

export type CopyWorkflowCamposFromCatalogInput = {
  contexto: CopyWorkflowCamposFromCatalogContexto;
  campo_dinamico_ids: string[];
};

export type CreateWorkflowParteCampoDinamicoInput = {
  etiqueta: string;
  clave: string;
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
  ancho_grilla?: WorkflowCampoAnchoGrilla;
  opciones?: WorkflowCampoDinamicoOpcionInput[];
};

export type UpdateWorkflowParteCampoDinamicoInput =
  Partial<CreateWorkflowParteCampoDinamicoInput>;

export type ReorderWorkflowParteCamposDinamicosInput = {
  campo_dinamico_ids: string[];
};

export type CopyWorkflowParteCamposFromParteInput = {
  sourceParteId: string;
};
