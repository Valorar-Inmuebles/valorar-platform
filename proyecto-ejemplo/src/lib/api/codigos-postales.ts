import { apiFetch } from "@/lib/api/fetch";
// ── Types ─────────────────────────────────────────────────────────────────────

export type CodigoPostal = {
  id: string;
  localidad_id: string;
  codigo_postal: string;
};

// ── GET BY LOCALIDAD ──────────────────────────────────────────────────────────

export async function getCodigosPostales(localidadId: string): Promise<CodigoPostal[]> {
  const res = await apiFetch(
    `/api/codigos-postales?localidad_id=${encodeURIComponent(localidadId)}`,
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener códigos postales");
  }
  return res.json();
}
