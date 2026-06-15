"use client";

import { useMemo } from "react";
import { WorkflowPublishValidationGrid } from "@/components/modules/workflows/workflow-publish-validation-grid";
import { WorkflowResumenExecutiveCard } from "@/components/modules/workflows/workflow-resumen-executive-card";
import { WorkflowStepResumenSections } from "@/components/modules/workflows/workflow-step-resumen-sections";
import { useWorkflowClassificationLabels } from "@/components/modules/workflows/use-workflow-classification-labels";
import {
  getWorkflowPublishChecks,
  isWorkflowPublishReady,
} from "@/components/modules/workflows/workflow-wizard-navigation";
import type { WorkflowDetailDto } from "@/lib/types/workflow";

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  onEditStep: (stepIndex: number) => void;
};

export function WorkflowStepResumen({
  workflow,
  readonly = false,
  onEditStep,
}: Props) {
  const labels = useWorkflowClassificationLabels(workflow);

  const publishChecks = useMemo(
    () => getWorkflowPublishChecks(workflow),
    [workflow],
  );

  const publishReady = isWorkflowPublishReady(workflow);
  const showPublishHint =
    workflow.estado === "borrador" && !readonly && !publishReady;

  const nombre = workflow.nombre?.trim() || "Sin nombre";
  const descripcion = workflow.descripcion?.trim() || null;

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">Confirmación</h2>
        <p className="text-sm text-zinc-500">
          Revisá el resumen y los requisitos antes de publicar.
        </p>
      </div>

      <WorkflowResumenExecutiveCard
        nombre={nombre}
        descripcion={descripcion}
        estado={workflow.estado}
        labels={labels}
      />

      <WorkflowStepResumenSections
        workflow={workflow}
        readonly={readonly}
        onEditStep={onEditStep}
      />

      {workflow.estado === "borrador" ? (
        <WorkflowPublishValidationGrid
          workflow={workflow}
          checks={publishChecks}
          showHint={showPublishHint}
        />
      ) : null}
    </div>
  );
}
