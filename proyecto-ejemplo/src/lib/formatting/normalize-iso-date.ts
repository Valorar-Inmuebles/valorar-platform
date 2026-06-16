const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoParts(yyyy: number, mm: number, dd: number): boolean {
  const date = new Date(yyyy, mm - 1, dd);
  return (
    date.getFullYear() === yyyy &&
    date.getMonth() === mm - 1 &&
    date.getDate() === dd
  );
}

function partsToIso(yyyy: string, mm: string, dd: string): string {
  const y = +yyyy;
  const m = +mm;
  const d = +dd;
  if (!isValidIsoParts(y, m, d)) return "";
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Normalize runtime date values to ISO YYYY-MM-DD.
 * Accepts Date (postgres.js), ISO strings, dd/mm/yyyy, or 8-digit ddmmyyyy input.
 * Returns empty string for blank/invalid values.
 */
export function normalizeIsoDateString(valor: unknown): string {
  if (valor === null || valor === undefined) return "";

  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return "";
    const yyyy = String(valor.getUTCFullYear());
    const mm = String(valor.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(valor.getUTCDate()).padStart(2, "0");
    return partsToIso(yyyy, mm, dd);
  }

  const s = String(valor).trim();
  if (s === "") return "";

  if (ISO_DATE_RE.test(s)) return s;

  // PostgreSQL timestamptz / ISO datetime (e.g. "1976-10-04 00:00:00+00", "1976-10-04T00:00:00Z")
  if (s.length > 10 && /^\d{4}-\d{2}-\d{2}/.test(s)) {
    const datePart = s.slice(0, 10);
    if (ISO_DATE_RE.test(datePart)) {
      const [yyyy, mm, dd] = datePart.split("-");
      const iso = partsToIso(yyyy, mm, dd);
      if (iso !== "") {
        console.warn("[normalizeIsoDateString] timestamptz normalized", {
          input: s,
          output: iso,
        });
        return iso;
      }
    }
  }

  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (slashMatch) {
    const [, dd, mm, yyyy] = slashMatch;
    return partsToIso(yyyy, mm, dd);
  }

  const digits = s.replace(/\D/g, "");
  if (digits.length === 8) {
    const dd = digits.slice(0, 2);
    const mm = digits.slice(2, 4);
    const yyyy = digits.slice(4, 8);
    return partsToIso(yyyy, mm, dd);
  }

  return "";
}

export function looksLikeRuntimeDateString(valor: unknown): boolean {
  if (typeof valor !== "string") return false;
  const s = valor.trim();
  if (s === "") return false;
  if (ISO_DATE_RE.test(s)) return true;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return true;
  return s.replace(/\D/g, "").length === 8;
}
