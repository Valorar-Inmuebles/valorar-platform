"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ContextIcon } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";
import type { WorkflowClassificationLabels } from "@/components/modules/workflows/use-workflow-classification-labels";
import type { WorkflowEstado } from "@/lib/types/workflow";

const ESTADO_LABEL: Record<WorkflowEstado, string> = {
  borrador: "Borrador",
  activo: "Activo",
  archivado: "Archivado",
};

const ESTADO_BADGE: Record<
  WorkflowEstado,
  "warning" | "success" | "neutral"
> = {
  borrador: "warning",
  activo: "success",
  archivado: "neutral",
};

type Props = {
  nombre: string;
  descripcion: string | null;
  estado: WorkflowEstado;
  labels: WorkflowClassificationLabels;
};

function formatClassificationSummary(
  labels: WorkflowClassificationLabels,
): string | null {
  const parts = [labels.tipo, labels.jurisdiccion, labels.fuero, labels.objeto]
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== "—");

  if (parts.length === 0) return null;
  return parts.join(" · ");
}

export function WorkflowResumenExecutiveCard({
  nombre,
  descripcion,
  estado,
  labels,
}: Props) {
  const classificationSummary = formatClassificationSummary(labels);

  return (
    <Card flat className="overflow-hidden">
      <div className="flex flex-wrap items-start gap-3 px-4 py-3">
        <ContextIcon tone="violet" size="sm">
          <Icon.FileText className="size-4" />
        </ContextIcon>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-0.5">
              <p className="text-sm font-semibold text-zinc-900">{nombre}</p>
              {descripcion ? (
                <p className="line-clamp-2 text-sm text-zinc-500">
                  {descripcion}
                </p>
              ) : null}
            </div>
            <Badge variant={ESTADO_BADGE[estado]} className="shrink-0">
              {ESTADO_LABEL[estado]}
            </Badge>
          </div>

          {classificationSummary ? (
            <p className="mt-1.5 text-sm text-zinc-600">{classificationSummary}</p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
