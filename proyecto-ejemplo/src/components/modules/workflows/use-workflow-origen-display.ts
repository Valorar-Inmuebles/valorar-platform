"use client";

import { useEffect, useState } from "react";
import { getWorkflow } from "@/lib/api/workflows.api";
import type { WorkflowDetailDto } from "@/lib/types/workflow";
import {
  inferOrigenDesdeCero,
  inferOrigenFromCloneSource,
  inferOrigenPendingClone,
  type WorkflowOrigenDisplay,
  type WorkflowOrigenDisplayKind,
} from "@/components/modules/workflows/workflow-origen-infer";
import {
  WORKFLOW_ORIGEN_OPTIONS,
  type WorkflowOrigenOption,
} from "@/components/modules/workflows/workflow-step-origen-cards";

function displayKindToOptionId(
  kind: WorkflowOrigenDisplayKind,
): WorkflowOrigenOption | null {
  if (kind === "desde-cero") return "desde-cero";
  if (kind === "plantilla") return "plantilla";
  if (kind === "clonar") return "clonar";
  return null;
}

export function useWorkflowOrigenDisplay(workflow: WorkflowDetailDto) {
  const [display, setDisplay] = useState<WorkflowOrigenDisplay>(() => {
    if (!workflow.cloned_from_workflow_id) {
      return inferOrigenDesdeCero();
    }
    return inferOrigenPendingClone(workflow.cloned_from_workflow_id);
  });
  const [loading, setLoading] = useState(
    Boolean(workflow.cloned_from_workflow_id),
  );

  useEffect(() => {
    if (!workflow.cloned_from_workflow_id) {
      setDisplay(inferOrigenDesdeCero());
      setLoading(false);
      return;
    }

    let cancelled = false;
    const cloneSourceId = workflow.cloned_from_workflow_id;

    setLoading(true);
    setDisplay(inferOrigenPendingClone(cloneSourceId));

    getWorkflow(cloneSourceId)
      .then((source) => {
        if (cancelled) return;
        setDisplay(inferOrigenFromCloneSource(source, cloneSourceId));
      })
      .catch(() => {
        if (cancelled) return;
        setDisplay(inferOrigenFromCloneSource(null, cloneSourceId));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workflow.cloned_from_workflow_id]);

  const optionId = displayKindToOptionId(display.kind);
  const optionMeta = optionId
    ? WORKFLOW_ORIGEN_OPTIONS.find((option) => option.id === optionId)
    : null;

  return { display, loading, optionMeta };
}
