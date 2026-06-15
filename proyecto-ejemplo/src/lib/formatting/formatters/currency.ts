import type { Formatter } from "@/lib/formatting/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

/** "1234,56" → "1.234,56" — adds thousand-separator dots during typing. */
function format(raw: string): string {
  const comma = raw.indexOf(",");
  const intPart = comma === -1 ? raw : raw.slice(0, comma);
  const decPart = comma === -1 ? "" : raw.slice(comma);
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + decPart;
}

/** 1000.5 → "1.000,50" — canonical ARS display with exactly 2 decimal places. */
function formatARS(n: number): string {
  const [int, dec] = n.toFixed(2).split(".");
  return int.replace(/\B(?=(\d{3})+(?!\d))/g, ".") + "," + dec;
}

/** Strips everything except digits and comma; enforces at most 2 decimal digits. */
function sanitize(input: string): string {
  const cleaned = input.replace(/[^\d,]/g, "");
  const idx = cleaned.indexOf(",");
  if (idx === -1) return cleaned;
  return (
    cleaned.slice(0, idx) +
    "," +
    cleaned.slice(idx + 1).replace(/,/g, "").slice(0, 2)
  );
}

function parse(raw: string): number | undefined {
  if (!raw || raw === ",") return undefined;
  const n = parseFloat(
    (raw.startsWith(",") ? "0" + raw : raw).replace(",", "."),
  );
  return isNaN(n) ? undefined : n;
}

// ── Formatter ─────────────────────────────────────────────────────────────────

export const currencyFormatter: Formatter<number> = {
  sanitize,
  format,
  finalize(raw) {
    const n = parse(raw);
    return n != null ? formatARS(n) : "";
  },
  parse,
  display: formatARS,
  isSeparator: (char) => char === ".",
};
