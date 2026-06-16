import { Badge, type BadgeVariant } from "@/components/ui/badge";
import type { AgendaEventoEstadoVisual } from "@/lib/types/agenda";

const ESTADO_LABELS: Record<AgendaEventoEstadoVisual, string> = {
  pendiente: "Pendiente",
  vencido: "Vencido",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

const ESTADO_VARIANT: Record<AgendaEventoEstadoVisual, BadgeVariant> = {
  pendiente: "warning",
  vencido: "danger",
  realizado: "success",
  cancelado: "neutral",
};

type Props = {
  estadoVisual: AgendaEventoEstadoVisual;
  className?: string;
};

export function AgendaEventoEstadoBadge({
  estadoVisual,
  className = "",
}: Props) {
  return (
    <Badge
      variant={ESTADO_VARIANT[estadoVisual]}
      className={`shrink-0 rounded-full ${className}`}
    >
      {ESTADO_LABELS[estadoVisual]}
    </Badge>
  );
}
