import { apiFetch } from "@/lib/api/fetch";
// ── Types ─────────────────────────────────────────────────────────────────────

export type Localidad = {
  id: string;
  provincia_id: string;
  nombre: string;
};

// ── SEARCH (server-side, min 2 chars, max 50 results) ────────────────────────

export async function searchLocalidades(
  provinciaId: string,
  query: string,
): Promise<Localidad[]> {
  const params = new URLSearchParams({
    provincia_id: provinciaId,
    q: query,
  });
  const res = await apiFetch(`/api/localidades/search?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al buscar localidades");
  }
  return res.json();
}
