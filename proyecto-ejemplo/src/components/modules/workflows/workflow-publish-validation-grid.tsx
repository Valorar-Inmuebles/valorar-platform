"use client";

import { Badge } from "@/components/ui/badge";
import { ContextIcon } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";
import type { WorkflowPublishCheck } from "@/components/modules/workflows/workflow-wizard-navigation";
import { countWorkflowTareas } from "@/components/modules/workflows/workflow-wizard-navigation";
import type { WorkflowDetailDto } from "@/lib/types/workflow";

const CHECK_TITLE: Record<WorkflowPublishCheck["id"], string> = {
  clasificacion: "Clasificación",
  etapas: "Etapas",
  partes: "Partes",
  tareas: "Tareas",
};

function getCheckSummary(
  check: WorkflowPublishCheck,
  workflow: WorkflowDetailDto,
): string {
  switch (check.id) {
    case "clasificacion":
      return check.pass ? "Completa" : "Incompleta";
    case "etapas": {
      const count = workflow.etapas.length;
      return count === 1 ? "1 definida" : `${count} definidas`;
    }
    case "partes": {
      const count = workflow.partes.length;
      return count === 1 ? "1 definida" : `${count} definidas`;
    }
    case "tareas": {
      const count = countWorkflowTareas(workflow);
      return count === 1 ? "1 definida" : `${count} definidas`;
    }
    default:
      return check.label;
  }
}

type ValidationCardProps = {
  title: string;
  summary: string;
  pass: boolean;
};

/** Superficies de validación — alineadas a ContextIcon success/warning. */
const VALIDATION_SURFACE_CLASS = {
  pass: "border-green-200 bg-green-50",
  fail: "border-amber-200 bg-amber-50",
} as const;

function PublishValidationCard({ title, summary, pass }: ValidationCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border ${VALIDATION_SURFACE_CLASS[pass ? "pass" : "fail"]}`}
    >
      <div className="px-3 py-2.5">
        <div className="flex items-start gap-2">
          <ContextIcon tone={pass ? "success" : "warning"} size="xs">
            {pass ? (
              <Icon.CheckDone className="size-3.5" />
            ) : (
              <Icon.Info className="size-3.5" />
            )}
          </ContextIcon>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-zinc-900">{title}</p>
            <p className="text-xs text-zinc-600">{summary}</p>
            <Badge
              variant={pass ? "success" : "warning"}
              className="mt-1.5"
            >
              {pass ? "Correcto" : "Pendiente"}
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}

type Props = {
  workflow: WorkflowDetailDto;
  checks: WorkflowPublishCheck[];
  showHint: boolean;
};

export function WorkflowPublishValidationGrid({
  workflow,
  checks,
  showHint,
}: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-zinc-900">
        Requisitos para publicar
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {checks.map((check) => (
          <PublishValidationCard
            key={check.id}
            title={CHECK_TITLE[check.id]}
            summary={getCheckSummary(check, workflow)}
            pass={check.pass}
          />
        ))}
      </div>
      {showHint ? (
        <div className="flex items-start gap-2 text-sm text-zinc-500">
          <Icon.Info className="mt-0.5 size-3.5 shrink-0 text-zinc-400" />
          <p>
            Debe completar todos los requisitos para poder publicar el workflow.
          </p>
        </div>
      ) : null}
    </div>
  );
}
