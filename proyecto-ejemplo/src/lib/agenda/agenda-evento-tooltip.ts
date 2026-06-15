import { getAgendaEventoPadreTooltipParts } from "@/lib/agenda/agenda-evento-padre-label";
import { formatAgendaFechaLarga, formatAgendaHorario } from "@/lib/agenda/format-agenda-datetime";
import type { AgendaEventoDto, AgendaEventoEstadoVisual } from "@/lib/types/agenda";

export const AGENDA_EVENTO_RESUMEN_TOOLTIP_DELAY_MS = 500;

export const AGENDA_EVENTO_RESUMEN_TOOLTIP_Z_INDEX = 50;
export const AGENDA_EVENTO_ICON_TOOLTIP_Z_INDEX = 60;

export const AGENDA_EVENTO_RESUMEN_TOOLTIP_CONTENT_CLASSNAME =
  "pointer-events-none w-max max-w-[280px] rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-normal leading-snug text-zinc-700 shadow-md [&_b]:font-semibold";

const ESTADO_VISUAL_LABELS: Record<AgendaEventoEstadoVisual, string> = {
  pendiente: "Pendiente",
  vencido: "Vencido",
  realizado: "Realizado",
  cancelado: "Cancelado",
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function appendLine(lines: string[], label: string, value: string): void {
  const trimmed = value.trim();
  if (!trimmed) return;
  lines.push(`<b>${escapeHtml(label)}:</b> ${escapeHtml(trimmed)}`);
}

/** Resumen HTML del evento para tooltips (etiquetas en negrita, una línea por campo). */
export function formatAgendaEventoResumenTooltip(evento: AgendaEventoDto): string {
  const lines: string[] = [];

  lines.push(`<b>${escapeHtml(evento.titulo.trim())}</b>`);

  const padre = evento.padre
    ? getAgendaEventoPadreTooltipParts(evento.padre)
    : null;
  if (padre) {
    appendLine(lines, padre.label, padre.value);
  }

  appendLine(lines, "Tipo", evento.tipo.nombre);

  const fecha = formatAgendaFechaLarga(evento.inicioAt);
  appendLine(lines, "Fecha", fecha);

  const horario = formatAgendaHorario({
    inicioAt: evento.inicioAt,
    finAt: evento.finAt,
    todoElDia: evento.todoElDia,
  });
  appendLine(lines, "Horario", horario);

  appendLine(lines, "Estado", ESTADO_VISUAL_LABELS[evento.estadoVisual]);

  if (evento.ubicacion) {
    appendLine(lines, "Ubicación", evento.ubicacion);
  }
  if (evento.descripcion) {
    appendLine(lines, "Descripción", evento.descripcion);
  }
  if (evento.observaciones) {
    appendLine(lines, "Observaciones", evento.observaciones);
  }

  const autor = evento.creadoPor.nombre?.trim();
  if (autor) {
    appendLine(lines, "Autor", autor);
  }

  return lines.join("<br />");
}
