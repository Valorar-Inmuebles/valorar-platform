/** Zona horaria de operación del producto (Argentina). */
export const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

/** Valores de instante desde Postgres (`timestamptz`) o APIs. */
export type TimestamptzInput = string | Date | null | undefined;

/**
 * Parsea instantes `timestamptz` de Postgres.
 * Si el string no trae offset, se asume UTC (comportamiento de timestamptz en API).
 */
export function parseTimestamptz(value: TimestamptzInput): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.includes("T") ? trimmed : trimmed.replace(" ", "T");
  const hasOffset = /([zZ]|[+-]\d{2}(:?\d{2})?)$/.test(normalized);
  const iso = hasOffset ? normalized : `${normalized}Z`;
  const date = new Date(iso);

  return Number.isNaN(date.getTime()) ? null : date;
}

export type FormatDisplayDateTimeOptions = {
  locale?: string;
  timeZone?: string;
};

/**
 * Formatea fecha/hora de API para mostrar en UI (es-AR, hora Argentina por defecto).
 */
export function formatDisplayDateTime(
  value: TimestamptzInput,
  options: FormatDisplayDateTimeOptions = {},
): string {
  const date = parseTimestamptz(value);
  if (!date) return "";

  const { locale = "es-AR", timeZone = APP_TIME_ZONE } = options;

  const datePart = new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone,
  }).format(date);

  const timePart = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone,
  }).format(date);

  return `${datePart} ${timePart}`;
}
