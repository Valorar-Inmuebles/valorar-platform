"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icons";
import { WorkflowEtapaOrderBadge } from "@/components/modules/workflows/workflow-etapa-order-badge";
import { WorkflowReviewSectionCard } from "@/components/modules/workflows/workflow-review-section-card";
import type { WorkflowOrigenDisplay } from "@/components/modules/workflows/workflow-origen-infer";
import { useWorkflowOrigenDisplay } from "@/components/modules/workflows/use-workflow-origen-display";
import { workflowStepIndexById } from "@/components/modules/workflows/workflow-wizard-steps";
import { countWorkflowParteCampos } from "@/components/modules/workflows/workflow-wizard-navigation";
import type { WorkflowDetailDto, WorkflowEtapaDto } from "@/lib/types/workflow";

const VISIBLE_BADGE_LIMIT = 4;

type Props = {
  workflow: WorkflowDetailDto;
  readonly?: boolean;
  onEditStep: (stepIndex: number) => void;
};

function getOrigenCompactLabel(display: WorkflowOrigenDisplay): string {
  switch (display.kind) {
    case "desde-cero":
      return "Creado desde cero";
    case "plantilla":
      return "Crear desde plantilla";
    case "clonar":
    case "clonado-indeterminado":
      return "Clonado desde workflow";
    default:
      return display.title;
  }
}

function OverflowLabel({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="text-xs font-medium text-zinc-500">+{count} más</span>
  );
}

function BadgeRow({
  items,
}: {
  items: Array<{ id: string; label: string; variant?: "info" | "neutral" }>;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Sin configurar</p>;
  }

  const visible = items.slice(0, VISIBLE_BADGE_LIMIT);
  const overflow = items.length - visible.length;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {visible.map((item) => (
        <Badge key={item.id} variant={item.variant ?? "neutral"}>
          {item.label}
        </Badge>
      ))}
      <OverflowLabel count={overflow} />
    </div>
  );
}

function EtapaInlineItem({
  etapa,
  position,
  taskCount,
}: {
  etapa: WorkflowEtapaDto;
  position: number;
  taskCount?: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <WorkflowEtapaOrderBadge position={position} color={etapa.color} />
      <span className="text-sm text-zinc-700">
        {etapa.nombre}
        {taskCount !== undefined ? (
          <span className="text-zinc-500"> ({taskCount})</span>
        ) : null}
      </span>
    </span>
  );
}

function EtapaInlineRow({
  etapas,
  withTaskCount = false,
}: {
  etapas: WorkflowDetailDto["etapas"];
  withTaskCount?: boolean;
}) {
  const sorted = useMemo(
    () => [...etapas].sort((a, b) => a.orden - b.orden),
    [etapas],
  );

  if (sorted.length === 0) {
    return <p className="text-sm text-zinc-500">Sin configurar</p>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      {sorted.map((etapa, index) => (
        <EtapaInlineItem
          key={etapa.id}
          etapa={etapa}
          position={index + 1}
          taskCount={
            withTaskCount ? (etapa.tareas?.length ?? 0) : undefined
          }
        />
      ))}
    </div>
  );
}

export function WorkflowStepResumenSections({
  workflow,
  readonly = false,
  onEditStep,
}: Props) {
  const { display: origenDisplay, loading: origenLoading, optionMeta } =
    useWorkflowOrigenDisplay(workflow);

  const sortedPartes = useMemo(
    () => [...workflow.partes].sort((a, b) => a.orden - b.orden),
    [workflow.partes],
  );

  const sortedCampos = useMemo(
    () => [...workflow.campos_dinamicos].sort((a, b) => a.orden - b.orden),
    [workflow.campos_dinamicos],
  );

  const camposPorParte = countWorkflowParteCampos(workflow);

  const parteBadges = useMemo(
    () =>
      sortedPartes.map((parte) => ({
        id: parte.id,
        label: parte.nombre,
        variant: parte.es_principal ? ("info" as const) : ("neutral" as const),
      })),
    [sortedPartes],
  );

  const campoBadges = useMemo(
    () =>
      sortedCampos.map((campo) => ({
        id: campo.id,
        label: campo.etiqueta,
        variant: "neutral" as const,
      })),
    [sortedCampos],
  );

  const origenStep = workflowStepIndexById("origen");
  const etapasStep = workflowStepIndexById("etapas");
  const partesStep = workflowStepIndexById("partes");
  const camposStep = workflowStepIndexById("campos");
  const tareasStep = workflowStepIndexById("tareas");

  const etapaCount = workflow.etapas.length;
  const tareaCount = workflow.etapas.reduce(
    (sum, etapa) => sum + (etapa.tareas?.length ?? 0),
    0,
  );

  return (
    <div className="space-y-2">
      <WorkflowReviewSectionCard
        title="Origen"
        tone={optionMeta?.tone ?? "neutral"}
        icon={
          optionMeta ? (
            <optionMeta.icon className="size-4" />
          ) : (
            <Icon.Layers className="size-4" />
          )
        }
        stepIndex={origenStep}
        readonly={readonly}
        onEditStep={onEditStep}
      >
        {origenLoading ? (
          <p className="text-sm text-zinc-400">Cargando…</p>
        ) : (
          <p className="text-sm text-zinc-700">
            {getOrigenCompactLabel(origenDisplay)}
          </p>
        )}
      </WorkflowReviewSectionCard>

      <WorkflowReviewSectionCard
        title="Etapas"
        meta={etapaCount > 0 ? `· ${etapaCount} etapas` : undefined}
        tone="primary"
        icon={<Icon.Layout className="size-4" />}
        stepIndex={etapasStep}
        readonly={readonly}
        onEditStep={onEditStep}
      >
        <EtapaInlineRow etapas={workflow.etapas} />
      </WorkflowReviewSectionCard>

      <WorkflowReviewSectionCard
        title="Partes"
        meta={
          sortedPartes.length > 0
            ? `· ${sortedPartes.length} partes`
            : undefined
        }
        tone="primary"
        icon={<Icon.Users className="size-4" />}
        stepIndex={partesStep}
        readonly={readonly}
        onEditStep={onEditStep}
      >
        <BadgeRow items={parteBadges} />
      </WorkflowReviewSectionCard>

      <WorkflowReviewSectionCard
        title="Campos dinámicos"
        meta={
          sortedCampos.length > 0 || camposPorParte > 0
            ? `· ${sortedCampos.length + camposPorParte} campos`
            : undefined
        }
        tone="neutral"
        icon={<Icon.FileText className="size-4" />}
        stepIndex={camposStep}
        readonly={readonly}
        onEditStep={onEditStep}
      >
        <div className="space-y-1">
          <BadgeRow items={campoBadges} />
          {camposPorParte > 0 ? (
            <p className="text-xs text-zinc-500">
              {camposPorParte}{" "}
              {camposPorParte === 1 ? "campo por parte" : "campos por parte"}
            </p>
          ) : null}
        </div>
      </WorkflowReviewSectionCard>

      <WorkflowReviewSectionCard
        title="Tareas sugeridas"
        meta={tareaCount > 0 ? `· ${tareaCount} tareas` : undefined}
        tone="success"
        icon={<Icon.Task className="size-4" />}
        stepIndex={tareasStep}
        readonly={readonly}
        onEditStep={onEditStep}
      >
        <EtapaInlineRow etapas={workflow.etapas} withTaskCount />
      </WorkflowReviewSectionCard>
    </div>
  );
}
