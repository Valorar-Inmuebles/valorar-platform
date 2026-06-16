import {
  APP_TIME_ZONE,
  parseTimestamptz,
} from "@/lib/datetime/format-display-datetime";

export function formatAgendaHorario(params: {
  inicioAt: string;
  finAt: string | null;
  todoElDia: boolean;
}): string {
  const { inicioAt, finAt, todoElDia } = params;

  if (todoElDia) return "Todo el día";

  const inicio = parseTimestamptz(inicioAt);
  if (!inicio) return "";

  const horaInicio = formatTime(inicio);
  const fin = finAt ? parseTimestamptz(finAt) : null;

  if (!fin) return horaInicio;
  return `${horaInicio} - ${formatTime(fin)}`;
}

export function formatAgendaFechaLarga(inicioAt: string): string {
  const date = parseTimestamptz(inicioAt);
  if (!date) return "";

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatAgendaFechaColumna(inicioAt: string): {
  mes: string;
  dia: string;
  diaSemana: string;
} {
  const date = parseTimestamptz(inicioAt);
  if (!date) {
    return { mes: "", dia: "", diaSemana: "" };
  }

  const mes = new Intl.DateTimeFormat("es-AR", {
    month: "short",
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace(".", "")
    .toUpperCase();

  const dia = new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);

  const diaSemana = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    timeZone: APP_TIME_ZONE,
  })
    .format(date)
    .replace(".", "");

  return { mes, dia, diaSemana };
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}
