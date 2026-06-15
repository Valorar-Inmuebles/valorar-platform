import { dateFormatter } from "@/lib/formatting/formatters/date";

/**
 * Visual formatters for display purposes only.
 * These produce human-readable strings and should NOT be used
 * as the value stored in the database — use parsers for that.
 */

/**
 * Formats a normalized DNI string for display.
 * "12345678" → "12.345.678"
 * "1234567"  → "1.234.567"
 */
export function formatDNI(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
  }
  if (digits.length === 7) {
    return `${digits.slice(0, 1)}.${digits.slice(1, 4)}.${digits.slice(4)}`;
  }
  return digits;
}

/**
 * Formats a normalized CUIL/CUIT string for display.
 * "20123456780" → "20-12345678-0"
 */
export function formatCUIL(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
  }
  return digits;
}

/**
 * Converts an ISO date string to dd/mm/yyyy for display in form inputs.
 * "1985-03-25" → "25/03/1985"
 */
export function formatFechaNacimiento(isoDate: string): string {
  const [yyyy, mm, dd] = isoDate.split("-");
  if (!yyyy || !mm || !dd) return isoDate;
  return `${dd}/${mm}/${yyyy}`;
}


/** Fecha ANSES sin conversión UTC: interpreta el valor tal cual viene en local. */
export function formatFechaLocal(
  value: string,
  options: "ConHora" | "SinHora" = "SinHora",
): string {
  const trimmed = value.trim();
  if (!trimmed) return "—";

  const [datePart, timePart] = trimmed.split(/[ T]/);
  if (!datePart || !/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return trimmed;

  const formattedDate = dateFormatter.display(datePart);
  if (options === "SinHora" || !timePart) return formattedDate;

  const timeMatch = /^(\d{2}:\d{2})(?::\d{2})?$/.exec(timePart);
  if (!timeMatch) return formattedDate;

  return `${formattedDate} ${timeMatch[1]}`;
}
