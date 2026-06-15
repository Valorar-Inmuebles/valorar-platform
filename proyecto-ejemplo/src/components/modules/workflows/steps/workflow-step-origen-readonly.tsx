"use client";

import { useEffect, useState } from "react";
import { getWorkflow } from "@/lib/api/workflows.api";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import { ContextIcon } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";
import {
  inferOrigenDesdeCero,
  inferOrigenFromCloneSource,
  inferOrigenPendingClone,
  type WorkflowOrigenDisplay,
  type WorkflowOrigenDisplayKind,
} from "@/components/modules/workflows/workflow-origen-infer";
import {
  OrigenOptionCard,
  WORKFLOW_ORIGEN_OPTIONS,
  type WorkflowOrigenOption,
} from "@/components/modules/workflows/workflow-step-origen-cards";

type Props = {
  workflow: WorkflowDetailDto;
};

function displayKindToOptionId(
  kind: WorkflowOrigenDisplayKind,
): WorkflowOrigenOption | null {
  if (kind === "desde-cero") return "desde-cero";
  if (kind === "plantilla") return "plantilla";
  if (kind === "clonar") return "clonar";
  return null;
}

function OrigenSourceReadonly({ nombre }: { nombre: string }) {
  return <p className="text-sm text-zinc-600">Origen: {nombre}</p>;
}

function OrigenIndeterminadoCard({ display }: { display: WorkflowOrigenDisplay }) {
  return (
    <OrigenOptionCard
      title={display.title}
      description={display.description}
      selected
      readOnly
      leading={
        <ContextIcon tone="neutral" size="sm">
          <Icon.Layers className="size-4" />
        </ContextIcon>
      }
    >
      {display.sourceWorkflowNombre ? (
        <OrigenSourceReadonly nombre={display.sourceWorkflowNombre} />
      ) : null}
      {display.limitation ? (
        <p className="text-xs text-zinc-400">{display.limitation}</p>
      ) : null}
    </OrigenOptionCard>
  );
}

export function WorkflowStepOrigenReadonly({ workflow }: Props) {
  const [display, setDisplay] = useState<WorkflowOrigenDisplay>(() => {
    if (!workflow.cloned_from_workflow_id) {
      return inferOrigenDesdeCero();
    }
    return inferOrigenPendingClone(workflow.cloned_from_workflow_id);
  });

  useEffect(() => {
    if (!workflow.cloned_from_workflow_id) {
      setDisplay(inferOrigenDesdeCero());
      return;
    }

    let cancelled = false;
    const cloneSourceId = workflow.cloned_from_workflow_id;

    setDisplay(inferOrigenPendingClone(cloneSourceId));

    getWorkflow(cloneSourceId)
      .then((source) => {
        if (cancelled) return;
        setDisplay(inferOrigenFromCloneSource(source, cloneSourceId));
      })
      .catch(() => {
        if (cancelled) return;
        setDisplay(inferOrigenFromCloneSource(null, cloneSourceId));
      });

    return () => {
      cancelled = true;
    };
  }, [workflow.cloned_from_workflow_id]);

  const selectedOptionId = displayKindToOptionId(display.kind);

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-semibold text-zinc-900">Origen</h2>
        <p className="text-sm text-zinc-500">
          Origen con el que se creó este workflow. No puede modificarse.
        </p>
      </div>

      <div className="space-y-3">
        {selectedOptionId === null ? (
          <OrigenIndeterminadoCard display={display} />
        ) : (
          WORKFLOW_ORIGEN_OPTIONS.map((option) => {
            const OptionIcon = option.icon;
            const selected = option.id === selectedOptionId;
            const showSource =
              selected &&
              display.sourceWorkflowNombre &&
              (option.id === "plantilla" || option.id === "clonar");

            return (
              <OrigenOptionCard
                key={option.id}
                title={option.title}
                description={option.description}
                recommended={option.recommended}
                selected={selected}
                readOnly
                leading={
                  <ContextIcon tone={option.tone} size="sm">
                    <OptionIcon className="size-4" />
                  </ContextIcon>
                }
              >
                {showSource ? (
                  <OrigenSourceReadonly nombre={display.sourceWorkflowNombre!} />
                ) : null}
              </OrigenOptionCard>
            );
          })
        )}
      </div>
    </div>
  );
}
