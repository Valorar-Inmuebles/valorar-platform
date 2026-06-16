import type {
  AgendaEntidadTipo,
  AgendaEventoPadreDto,
} from "@/lib/types/agenda";

const ENTIDAD_TIPO_LABELS: Record<AgendaEventoPadreDto["entidadTipo"], string> = {
  expediente: "expediente",
  caso: "caso",
  cliente: "cliente",
  legajo: "legajo",
  tarea: "tarea",
  actuacion: "actuación",
};

const ENTIDAD_TIPO_TOOLTIP_LABELS: Record<
  AgendaEventoPadreDto["entidadTipo"],
  string
> = {
  expediente: "Expediente",
  caso: "Caso",
  cliente: "Cliente",
  legajo: "Legajo",
  tarea: "Tarea",
  actuacion: "Actuación",
};

export function isAgendaEventoEnMismoContexto(
  padre: AgendaEventoPadreDto,
  context?: { entidadTipo: AgendaEntidadTipo; entidadId: string },
): boolean {
  if (!context) return false;
  return (
    padre.entidadTipo === context.entidadTipo &&
    padre.entidadId === context.entidadId
  );
}

export function getAgendaEventoPadreLabel(padre: AgendaEventoPadreDto): string {
  const etiqueta = padre.etiqueta?.trim();
  const tipoLabel = ENTIDAD_TIPO_LABELS[padre.entidadTipo];
  return etiqueta
    ? `Ir al ${tipoLabel}: "${etiqueta}"`
    : `Ir al ${tipoLabel}`;
}

/** Etiqueta del padre para tooltips: `Caso: "nombre - número"`. */
export function getAgendaEventoPadreTooltipParts(
  padre: AgendaEventoPadreDto,
): { label: string; value: string } | null {
  const etiqueta = padre.etiqueta?.trim();
  if (!etiqueta) return null;

  return {
    label: ENTIDAD_TIPO_TOOLTIP_LABELS[padre.entidadTipo],
    value: `"${etiqueta}"`,
  };
}
