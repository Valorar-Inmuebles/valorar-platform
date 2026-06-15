import type { WorkflowEtapaColor } from "@/lib/types/workflow";
import { WORKFLOW_ETAPA_ORDER_CIRCLE_CLASS } from "@/components/modules/workflows/workflow-etapa-colors";

type Props = {
  position: number;
  color: WorkflowEtapaColor;
  className?: string;
};

export function WorkflowEtapaOrderBadge({
  position,
  color,
  className = "",
}: Props) {
  return (
    <span
      className={`flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums ${WORKFLOW_ETAPA_ORDER_CIRCLE_CLASS[color]} ${className}`}
      aria-label={`Etapa ${position}`}
    >
      {position}
    </span>
  );
}
