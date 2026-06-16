import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ContextIcon,
  type ContextIconTone,
} from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";
import { useWorkflowClassificationLabels } from "@/components/modules/workflows/use-workflow-classification-labels";
import type { WorkflowDetailDto, WorkflowEstado } from "@/lib/types/workflow";

const ESTADO_LABEL: Record<WorkflowEstado, string> = {
  borrador: "Borrador",
  activo: "Activo",
  archivado: "Archivado",
};

type WorkflowSummaryRowProps = {
  tone: ContextIconTone;
  icon: React.ReactNode;
  label: string;
  value: string | null;
  placeholder?: string;
};

function WorkflowSummaryRow({
  tone,
  icon,
  label,
  value,
  placeholder = "—",
}: WorkflowSummaryRowProps) {
  const filled = Boolean(value);

  return (
    <div className="flex items-start gap-2.5">
      <ContextIcon tone={tone} size="xs">
        {icon}
      </ContextIcon>
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="text-xs text-gray-400">{label}</p>
        <p
          className={`truncate text-xs leading-snug ${
            filled ? "font-medium text-gray-900" : "text-gray-400"
          }`}
        >
          {filled ? value : placeholder}
        </p>
      </div>
    </div>
  );
}

type Props = {
  workflow: WorkflowDetailDto | null;
};

export function WorkflowSummarySidebar({ workflow }: Props) {
  const labels = useWorkflowClassificationLabels(workflow);

  const nombreValue = workflow?.nombre?.trim() || null;
  const estadoValue = workflow
    ? ESTADO_LABEL[workflow.estado]
    : "Borrador";

  return (
    <Card flat className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <ContextIcon tone="primary" size="sm">
            <Icon.FileText className="size-4" />
          </ContextIcon>
          <CardTitle>Resumen</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        <WorkflowSummaryRow
          tone="neutral"
          icon={<Icon.FileText className="size-3.5" />}
          label="Nombre"
          value={nombreValue}
          placeholder="Sin definir"
        />
        <WorkflowSummaryRow
          tone="success"
          icon={<Icon.CheckDone className="size-3.5" />}
          label="Estado"
          value={estadoValue}
        />

        <div className="space-y-2.5 border-t border-gray-100 pt-3">
          <WorkflowSummaryRow
            tone="neutral"
            icon={<Icon.Briefcase className="size-3.5" />}
            label="Tipo"
            value={labels.tipo}
          />
          <WorkflowSummaryRow
            tone="violet"
            icon={<Icon.Layers className="size-3.5" />}
            label="Jurisdicción"
            value={labels.jurisdiccion}
          />
          <WorkflowSummaryRow
            tone="violet"
            icon={<Icon.Layers className="size-3.5" />}
            label="Fuero"
            value={labels.fuero}
          />
          <WorkflowSummaryRow
            tone="neutral"
            icon={<Icon.FileText className="size-3.5" />}
            label="Objeto"
            value={labels.objeto}
          />
          <WorkflowSummaryRow
            tone="primary"
            icon={<Icon.Users className="size-3.5" />}
            label="Rol"
            value={labels.rol}
          />
          <WorkflowSummaryRow
            tone="violet"
            icon={<Icon.Layers className="size-3.5" />}
            label="Etapas"
            value={String(workflow?.etapas.length ?? 0)}
          />
          <WorkflowSummaryRow
            tone="primary"
            icon={<Icon.Users className="size-3.5" />}
            label="Partes"
            value={String(workflow?.partes.length ?? 0)}
          />
          <WorkflowSummaryRow
            tone="neutral"
            icon={<Icon.FileText className="size-3.5" />}
            label="Campos dinámicos"
            value={String(workflow?.campos_dinamicos.length ?? 0)}
          />
        </div>
      </CardContent>
    </Card>
  );
}
