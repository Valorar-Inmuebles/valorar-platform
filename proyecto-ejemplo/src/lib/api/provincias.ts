import { apiFetch } from "@/lib/api/fetch";
// ── Types ─────────────────────────────────────────────────────────────────────

export type Provincia = {
  id: string;
  nombre: string;
  codigo_iso: string | null;
  codigo_afip: string | null;
};

// ── GET ALL ───────────────────────────────────────────────────────────────────

export async function getProvincias(): Promise<Provincia[]> {
  const res = await apiFetch("/api/provincias");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener provincias");
  }
  return res.json();
}
