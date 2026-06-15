import { WORKFLOW_WIZARD_STEP_COUNT } from "@/components/modules/workflows/workflow-wizard-steps";
import { WORKFLOW_CLASSIFICATION_FIELDS } from "@/lib/types/workflow";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import type { WorkflowWizardMode } from "@/components/layout/workflow-wizard-layout";

export function hasCompleteClassification(
  workflow: WorkflowDetailDto | null,
): boolean {
  if (!workflow) return false;

  return WORKFLOW_CLASSIFICATION_FIELDS.every((field) => {
    const value = workflow[field];
    return typeof value === "string" && value.trim().length > 0;
  });
}

export function hasPrincipalParte(workflow: WorkflowDetailDto | null): boolean {
  if (!workflow) return false;
  return workflow.partes.filter((parte) => parte.es_principal).length === 1;
}

export function hasValidPartes(workflow: WorkflowDetailDto | null): boolean {
  if (!workflow) return false;
  return workflow.partes.length > 0 && hasPrincipalParte(workflow);
}

/**
 * Guardrail de deep links (edit/view):
 * - Sin clasificación completa → máximo Paso 2 (índice 1)
 * - Con clasificación pero sin etapas → máximo Paso 3 (índice 2)
 * - Con etapas pero sin partes válidas → máximo Paso 4 (índice 3)
 * - Caso contrario → todos los pasos
 */
export function getMaxAllowedStepIndex(
  workflow: WorkflowDetailDto | null,
): number {
  if (!workflow) return 0;

  if (!hasCompleteClassification(workflow)) {
    return 1;
  }

  if (workflow.etapas.length === 0) {
    return 2;
  }

  if (!hasValidPartes(workflow)) {
    return 3;
  }

  return WORKFLOW_WIZARD_STEP_COUNT - 1;
}

export function clampStepIndex(index: number, maxIndex: number): number {
  return Math.max(0, Math.min(index, maxIndex));
}

export function parseStepParam(stepParam: string | null): number {
  if (!stepParam) return 0;

  const parsed = Number.parseInt(stepParam, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 0;

  return parsed - 1;
}

export function resolveStepIndexFromUrl(
  stepParam: string | null,
  mode: WorkflowWizardMode,
  workflow: WorkflowDetailDto | null,
): number {
  if (mode === "create") return 0;

  const requested = parseStepParam(stepParam);
  const maxIndex = getMaxAllowedStepIndex(workflow);
  return clampStepIndex(requested, maxIndex);
}

export function stepNumberFromIndex(index: number): number {
  return index + 1;
}

export function countWorkflowTareas(workflow: WorkflowDetailDto): number {
  return workflow.etapas.reduce(
    (sum, etapa) => sum + (etapa.tareas?.length ?? 0),
    0,
  );
}

export function countWorkflowParteCampos(workflow: WorkflowDetailDto): number {
  return workflow.partes.reduce(
    (sum, parte) => sum + (parte.campos_dinamicos?.length ?? 0),
    0,
  );
}

export type WorkflowPublishCheck = {
  id: string;
  label: string;
  pass: boolean;
  failMessage: string;
};

export function getWorkflowPublishChecks(
  workflow: WorkflowDetailDto | null,
): WorkflowPublishCheck[] {
  if (!workflow) {
    return [
      {
        id: "clasificacion",
        label: "Clasificación completa",
        pass: false,
        failMessage: "Debe completar la clasificación del workflow.",
      },
      {
        id: "etapas",
        label: "Al menos 1 etapa",
        pass: false,
        failMessage: "Debe configurar al menos una etapa.",
      },
      {
        id: "partes",
        label: "Al menos 1 parte",
        pass: false,
        failMessage: "Debe configurar al menos una parte.",
      },
      {
        id: "tareas",
        label: "Al menos 1 tarea",
        pass: false,
        failMessage: "Debe configurar al menos una tarea.",
      },
    ];
  }

  return [
    {
      id: "clasificacion",
      label: "Clasificación completa",
      pass: hasCompleteClassification(workflow),
      failMessage: "Debe completar la clasificación del workflow.",
    },
    {
      id: "etapas",
      label: "Al menos 1 etapa",
      pass: workflow.etapas.length >= 1,
      failMessage: "Debe configurar al menos una etapa.",
    },
    {
      id: "partes",
      label: "Al menos 1 parte",
      pass: workflow.partes.length >= 1,
      failMessage: "Debe configurar al menos una parte.",
    },
    {
      id: "tareas",
      label: "Al menos 1 tarea",
      pass: countWorkflowTareas(workflow) >= 1,
      failMessage: "Debe configurar al menos una tarea.",
    },
  ];
}

export function isWorkflowPublishReady(
  workflow: WorkflowDetailDto | null,
): boolean {
  return getWorkflowPublishChecks(workflow).every((check) => check.pass);
}
