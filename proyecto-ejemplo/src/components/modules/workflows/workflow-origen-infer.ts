import type { WorkflowDetailDto, WorkflowOrigen } from "@/lib/types/workflow";

export type WorkflowOrigenDisplayKind =
  | "desde-cero"
  | "plantilla"
  | "clonar"
  | "clonado-indeterminado";

export type WorkflowOrigenDisplay = {
  kind: WorkflowOrigenDisplayKind;
  title: string;
  description: string;
  sourceWorkflowId: string | null;
  sourceWorkflowNombre: string | null;
  sourceOrigen: WorkflowOrigen | null;
  limitation: string | null;
};

export function inferOrigenFromCloneSource(
  source: WorkflowDetailDto | null,
  cloneSourceId: string,
): WorkflowOrigenDisplay {
  if (!source) {
    return {
      kind: "clonado-indeterminado",
      title: "Workflow clonado",
      description:
        "Este workflow se creó a partir de otro workflow. No se pudo cargar el origen.",
      sourceWorkflowId: cloneSourceId,
      sourceWorkflowNombre: null,
      sourceOrigen: null,
      limitation:
        "Plantilla JurilexIA vs clonación de organización no pudo confirmarse sin acceso al workflow origen.",
    };
  }

  if (source.origen === "system") {
    return {
      kind: "plantilla",
      title: "Plantilla JurilexIA",
      description: `Clonado desde la plantilla «${source.nombre}».`,
      sourceWorkflowId: source.id,
      sourceWorkflowNombre: source.nombre,
      sourceOrigen: source.origen,
      limitation: null,
    };
  }

  return {
    kind: "clonar",
    title: "Workflow clonado",
    description: `Clonado desde «${source.nombre}» de tu organización.`,
    sourceWorkflowId: source.id,
    sourceWorkflowNombre: source.nombre,
    sourceOrigen: source.origen,
    limitation: null,
  };
}

export function inferOrigenDesdeCero(): WorkflowOrigenDisplay {
  return {
    kind: "desde-cero",
    title: "Creado desde cero",
    description:
      "Este workflow se inició sin plantilla ni clonación (borrador vacío).",
    sourceWorkflowId: null,
    sourceWorkflowNombre: null,
    sourceOrigen: null,
    limitation: null,
  };
}

export function inferOrigenPendingClone(
  cloneSourceId: string,
): WorkflowOrigenDisplay {
  return {
    kind: "clonado-indeterminado",
    title: "Workflow clonado",
    description: "Este workflow se creó a partir de otro workflow.",
    sourceWorkflowId: cloneSourceId,
    sourceWorkflowNombre: null,
    sourceOrigen: null,
    limitation:
      "Determinando si el origen fue plantilla JurilexIA u otro workflow de la organización…",
  };
}
