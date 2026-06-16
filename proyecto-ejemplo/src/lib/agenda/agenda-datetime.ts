import { APP_TIME_ZONE, parseTimestamptz } from "@/lib/datetime/format-display-datetime";

/** Argentina no usa DST desde 2009: offset fijo -03:00 */
const AR_OFFSET = "-03:00";

export function buildAgendaTimestamps(params: {
  fecha: string;
  horaInicio?: string;
  horaFin?: string | null;
  todoElDia: boolean;
}): { inicioAt: string; finAt: string | null } {
  const { fecha, horaInicio, horaFin, todoElDia } = params;

  if (todoElDia) {
    const inicioAt = new Date(`${fecha}T00:00:00${AR_OFFSET}`).toISOString();
    const finAt = new Date(`${fecha}T23:59:59${AR_OFFSET}`).toISOString();
    return { inicioAt, finAt };
  }

  const inicioAt = new Date(
    `${fecha}T${horaInicio ?? "00:00"}:00${AR_OFFSET}`,
  ).toISOString();

  const finAt = horaFin
    ? new Date(`${fecha}T${horaFin}:00${AR_OFFSET}`).toISOString()
    : null;

  return { inicioAt, finAt };
}

export function splitAgendaTimestamps(params: {
  inicioAt: string;
  finAt: string | null;
  todoElDia: boolean;
}): {
  fecha: string;
  horaInicio: string;
  horaFin: string;
} {
  const { inicioAt, finAt, todoElDia } = params;
  const inicio = parseTimestamptz(inicioAt);
  if (!inicio) {
    return { fecha: "", horaInicio: "", horaFin: "" };
  }

  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(inicio);

  if (todoElDia) {
    return { fecha, horaInicio: "", horaFin: "" };
  }

  const horaInicio = formatInTimeZone(inicio, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const fin = finAt ? parseTimestamptz(finAt) : null;
  const horaFin = fin
    ? formatInTimeZone(fin, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "";

  return { fecha, horaInicio, horaFin };
}

function formatInTimeZone(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat("es-AR", {
    ...options,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}
