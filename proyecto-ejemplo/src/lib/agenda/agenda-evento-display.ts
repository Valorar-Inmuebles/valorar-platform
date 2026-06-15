import type { AgendaEventoDto } from "@/lib/types/agenda";

export function isAgendaEventoEstadoMuted(evento: AgendaEventoDto): boolean {
  return evento.estado === "realizado" || evento.estado === "cancelado";
}

export function getAgendaEventoBackgroundColor(evento: AgendaEventoDto): string {
  const { colorFondo } = evento.tipo;
  if (isAgendaEventoEstadoMuted(evento)) {
    return `color-mix(in srgb, ${colorFondo} 38%, white)`;
  }
  return colorFondo;
}

export function getAgendaEventoRowBackgroundColor(evento: AgendaEventoDto): string {
  const { colorFondo } = evento.tipo;
  if (isAgendaEventoEstadoMuted(evento)) {
    return `color-mix(in srgb, ${colorFondo} 22%, white)`;
  }
  return `${colorFondo}33`;
}

export function getAgendaEventoTitleClassName(evento: AgendaEventoDto): string {
  if (evento.estado === "cancelado") {
    return "line-through opacity-75";
  }
  if (evento.estado === "realizado") {
    return "opacity-90";
  }
  return "";
}
