import type { Formatter } from "@/lib/formatting/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Progressive dd/mm/yyyy formatting during typing.
 * Raw input is digits only; slashes are auto-inserted as separators.
 */
function format(raw: string): string {
  if (raw.length <= 2) return raw;
  if (raw.length <= 4) return raw.slice(0, 2) + "/" + raw.slice(2);
  return raw.slice(0, 2) + "/" + raw.slice(2, 4) + "/" + raw.slice(4, 8);
}

/**
 * Converts 8 raw digits (ddmmyyyy) to an ISO date string (YYYY-MM-DD).
 * Returns undefined for incomplete or calendar-invalid dates.
 */
function parse(raw: string): string | undefined {
  if (raw.length < 8) return undefined;
  const dd = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const yyyy = raw.slice(4, 8);
  const date = new Date(+yyyy, +mm - 1, +dd);
  const isValid =
    date.getFullYear() === +yyyy &&
    date.getMonth() === +mm - 1 &&
    date.getDate() === +dd;
  return isValid ? `${yyyy}-${mm}-${dd}` : undefined;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export const dateFormatter: Formatter<string> = {
  sanitize: (input) => input.replace(/\D/g, "").slice(0, 8),
  format,
  finalize: format,
  parse,
  display(value) {
    // value is ISO "YYYY-MM-DD" — convert to digit string ddmmyyyy for format()
    if (value.includes("-")) {
      const [yyyy = "", mm = "", dd = ""] = value.split("-");
      return format(dd + mm + yyyy);
    }
    return format(value.replace(/\D/g, ""));
  },
  isSeparator: (char) => char === "/",
};
