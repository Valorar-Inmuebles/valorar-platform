import { Badge } from "@/components/ui/badge";
import type { WorkflowEtapaDto } from "@/lib/types/workflow";

type Props = {
  etapa: Pick<WorkflowEtapaDto, "es_inicial" | "es_final">;
  className?: string;
};

export function WorkflowEtapaTypeBadges({ etapa, className = "" }: Props) {
  if (etapa.es_inicial && etapa.es_final) {
    return (
      <div className={`flex shrink-0 flex-wrap gap-1 ${className}`}>
        <Badge variant="info">Inicial</Badge>
        <Badge variant="success">Final</Badge>
      </div>
    );
  }

  if (etapa.es_inicial) {
    return (
      <Badge variant="info" className={className}>
        Inicial
      </Badge>
    );
  }

  if (etapa.es_final) {
    return (
      <Badge variant="success" className={className}>
        Final
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" className={className}>
      Normal
    </Badge>
  );
}
