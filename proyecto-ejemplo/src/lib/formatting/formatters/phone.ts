import type { Formatter } from "@/lib/formatting/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Simple structural formatter for Argentine phone numbers (3-4-4 grouping).
 *
 * Covers the most common Buenos Aires landline pattern:
 *   "01144445678" → "011 4444-5678"
 *
 * Raw stored value is digits only (no spaces or dashes).
 * Max 11 digits (0 + 2-digit area + 8-digit number).
 */
function format(raw: string): string {
  if (raw.length <= 3) return raw;
  if (raw.length <= 7) return raw.slice(0, 3) + " " + raw.slice(3);
  return raw.slice(0, 3) + " " + raw.slice(3, 7) + "-" + raw.slice(7, 11);
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export const phoneFormatter: Formatter<string> = {
  sanitize: (input) => input.replace(/\D/g, "").slice(0, 11),
  format,
  finalize: format,
  parse: (raw) => (raw || undefined),
  display: (value) => format(value.replace(/\D/g, "")),
  isSeparator: (char) => char === " " || char === "-",
};
