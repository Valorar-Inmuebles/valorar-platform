import { parseTimestamptz } from "@/lib/datetime/format-display-datetime";
import type {
  AgendaEventoEstado,
  AgendaEventoEstadoVisual,
} from "@/lib/types/agenda";

export function computeEstadoVisual(params: {
  estado: AgendaEventoEstado;
  inicioAt: string;
  finAt: string | null;
  now?: Date;
}): AgendaEventoEstadoVisual {
  const { estado, inicioAt, finAt, now = new Date() } = params;

  if (estado === "cancelado") return "cancelado";
  if (estado === "realizado") return "realizado";

  const reference = parseTimestamptz(finAt ?? inicioAt);
  if (reference && reference.getTime() < now.getTime()) {
    return "vencido";
  }

  return "pendiente";
}
