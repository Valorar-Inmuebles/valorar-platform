import { anchorToDateKey } from "@/lib/agenda/agenda-view-range";
import {
  formatAgendaFechaLarga,
  formatAgendaHorario,
} from "@/lib/agenda/format-agenda-datetime";
import { parseTimestamptz } from "@/lib/datetime/format-display-datetime";
import { escapeHtml } from "@/lib/notificaciones/escape-html";

export const AGENDA_EVENTO_AVISO_TIPO = "agenda.evento.aviso";

export const AGENDA_EVENTO_NOTIFICACION_ID_PREFIX = "agenda-evento:";

export function agendaEventoNotificacionId(eventoId: string): string {
  return `${AGENDA_EVENTO_NOTIFICACION_ID_PREFIX}${eventoId}`;
}

export function parseAgendaEventoNotificacionId(id: string): string | null {
  if (!id.startsWith(AGENDA_EVENTO_NOTIFICACION_ID_PREFIX)) return null;
  const eventoId = id.slice(AGENDA_EVENTO_NOTIFICACION_ID_PREFIX.length);
  return eventoId.length > 0 ? eventoId : null;
}

export function buildAgendaEventoAvisoLink(
  eventoId: string,
  inicioAt: string,
): string {
  const date = parseTimestamptz(inicioAt);
  const fecha = date ? anchorToDateKey(date) : anchorToDateKey(new Date());
  const params = new URLSearchParams({
    evento_id: eventoId,
    fecha,
    v: "day",
  });
  return `/agenda?${params.toString()}`;
}

export function buildAgendaEventoAvisoMensaje(params: {
  titulo: string;
  inicioAt: string;
  finAt: string | null;
  todoElDia: boolean;
}): string {
  const titulo = escapeHtml(params.titulo.trim() || "Sin título");
  const fecha = escapeHtml(formatAgendaFechaLarga(params.inicioAt));

  if (params.todoElDia) {
    return `Recordatorio: el evento <strong>${titulo}</strong> es todo el día el ${fecha}.`;
  }

  const horario = formatAgendaHorario({
    inicioAt: params.inicioAt,
    finAt: params.finAt,
    todoElDia: false,
  });

  if (!horario) {
    return `Recordatorio: el evento <strong>${titulo}</strong> comienza el ${fecha}.`;
  }

  return `Recordatorio: el evento <strong>${titulo}</strong> comienza el ${fecha} a las ${escapeHtml(horario)}.`;
}
