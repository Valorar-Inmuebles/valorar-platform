import {
  createDraftWorkflow,
  cloneWorkflow,
} from "@/lib/api/workflows.api";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import type { WorkflowOrigenOption } from "@/components/modules/workflows/steps/workflow-step-origen";

export async function persistWorkflowOrigen(
  origen: WorkflowOrigenOption,
  plantillaId: string,
  cloneSourceId: string,
): Promise<WorkflowDetailDto> {
  if (origen === "plantilla") {
    if (!plantillaId) {
      throw new Error("Seleccioná una plantilla JurilexIA.");
    }
    return cloneWorkflow(plantillaId);
  }

  if (origen === "clonar") {
    if (!cloneSourceId) {
      throw new Error("Seleccioná un workflow de tu organización.");
    }
    return cloneWorkflow(cloneSourceId);
  }

  return createDraftWorkflow();
}
