import type {
  AgendaEventoNotificarAntes,
  AgendaNotificarAntesUnidad,
} from "@/lib/types/agenda";

const UNIDAD_LABELS: Record<
  AgendaNotificarAntesUnidad,
  { singular: string; plural: string }
> = {
  minutos: { singular: "minuto", plural: "minutos" },
  horas: { singular: "hora", plural: "horas" },
  dias: { singular: "día", plural: "días" },
};

export const AGENDA_NOTIFICAR_ANTES_UNIDAD_OPTIONS: Array<{
  value: AgendaNotificarAntesUnidad;
  label: string;
}> = [
  { value: "minutos", label: "Minutos" },
  { value: "horas", label: "Horas" },
  { value: "dias", label: "Días" },
];

export const AGENDA_NOTIFICAR_ANTES_DEFAULT: AgendaEventoNotificarAntes = {
  cantidad: 30,
  unidad: "minutos",
};

export function mapNotificarAntesFromRow(
  cantidad: number | null | undefined,
  unidad: AgendaNotificarAntesUnidad | null | undefined,
): AgendaEventoNotificarAntes | null {
  if (cantidad == null || unidad == null) return null;
  return { cantidad, unidad };
}

export function notificarAntesToMinutes(
  notificarAntes: AgendaEventoNotificarAntes,
): number {
  const { cantidad, unidad } = notificarAntes;
  if (unidad === "horas") return cantidad * 60;
  if (unidad === "dias") return cantidad * 24 * 60;
  return cantidad;
}

export function formatAgendaNotificarAntesLabel(
  notificarAntes: AgendaEventoNotificarAntes,
): string {
  const labels = UNIDAD_LABELS[notificarAntes.unidad];
  const unidadLabel =
    notificarAntes.cantidad === 1 ? labels.singular : labels.plural;
  return `${notificarAntes.cantidad} ${unidadLabel} antes`;
}
