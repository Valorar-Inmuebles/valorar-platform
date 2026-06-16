import type { Formatter } from "@/lib/formatting/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Progressive CUIT/CUIL formatting during typing:
 *   2 digits → "20"
 *   3–10 digits → "20-1234567"
 *   11 digits → "20-12345678-0"
 *
 * Raw stored value is always 11 digits (no dashes).
 */
function format(raw: string): string {
  if (raw.length <= 2) return raw;
  if (raw.length <= 10) return raw.slice(0, 2) + "-" + raw.slice(2);
  return raw.slice(0, 2) + "-" + raw.slice(2, 10) + "-" + raw.slice(10);
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export const cuitFormatter: Formatter<string> = {
  sanitize: (input) => input.replace(/\D/g, "").slice(0, 11),
  format,
  finalize: format,
  parse: (raw) => (raw ? raw : undefined),
  display: (value) => format(value.replace(/\D/g, "")),
  isSeparator: (char) => char === "-",
};
