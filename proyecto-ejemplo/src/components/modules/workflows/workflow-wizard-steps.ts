import type { StepperStep } from "@/components/ui/stepper";

export const WORKFLOW_WIZARD_STEPS: StepperStep[] = [
  { id: "origen", label: "Origen", description: "Plantilla, clonación o cero" },
  {
    id: "clasificacion",
    label: "Clasificación",
    description: "Tipo, jurisdicción y nombre",
  },
  { id: "etapas", label: "Etapas", description: "Flujo del proceso" },
  { id: "partes", label: "Partes", description: "Actores del expediente" },
  {
    id: "campos",
    label: "Campos dinámicos",
    description: "Datos adicionales",
  },
  {
    id: "tareas",
    label: "Tareas sugeridas",
    description: "Checklist por etapa",
  },
  {
    id: "confirmacion",
    label: "Confirmación",
    description: "Resumen y cierre",
  },
];

export const WORKFLOW_WIZARD_STEP_COUNT = WORKFLOW_WIZARD_STEPS.length;

export function workflowStepIdAt(index: number): string {
  return WORKFLOW_WIZARD_STEPS[index]?.id ?? WORKFLOW_WIZARD_STEPS[0].id;
}

export function workflowStepIndexById(stepId: string): number {
  const index = WORKFLOW_WIZARD_STEPS.findIndex((step) => step.id === stepId);
  return index >= 0 ? index : 0;
}

export function workflowStepLabelAt(index: number): string {
  return WORKFLOW_WIZARD_STEPS[index]?.label ?? "Paso";
}
