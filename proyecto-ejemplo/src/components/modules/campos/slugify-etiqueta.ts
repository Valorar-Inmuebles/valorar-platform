/**
 * Genera una clave técnica a partir de la etiqueta (snake_case, minúsculas).
 * Cumple el formato esperado por campos_dinamicos.clave.
 */
export function slugifyEtiqueta(etiqueta: string): string {
  let s = etiqueta
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");

  if (!s) return "";

  if (!/^[a-z]/.test(s)) {
    s = `campo_${s}`;
  }

  return s.slice(0, 80);
}
