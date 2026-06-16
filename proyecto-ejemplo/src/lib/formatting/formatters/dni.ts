import type { Formatter } from "@/lib/formatting/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Groups digits from the right in threes, matching Argentine DNI display:
 *   7 digits → "X.XXX.XXX"
 *   8 digits → "XX.XXX.XXX"
 *
 * During typing, groups are applied progressively from the current digit count,
 * so the format always stays consistent without knowing the final length upfront.
 */
function format(raw: string): string {
  if (raw.length <= 3) return raw;
  if (raw.length <= 6)
    return raw.slice(0, raw.length - 3) + "." + raw.slice(-3);
  return (
    raw.slice(0, raw.length - 6) +
    "." +
    raw.slice(raw.length - 6, raw.length - 3) +
    "." +
    raw.slice(-3)
  );
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export const dniFormatter: Formatter<string> = {
  sanitize: (input) => input.replace(/\D/g, "").slice(0, 8),
  format,
  finalize: format,
  parse: (raw) => (raw ? raw : undefined),
  display: (value) => format(value.replace(/\D/g, "")),
  isSeparator: (char) => char === ".",
};
