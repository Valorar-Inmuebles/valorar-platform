import { apiFetch } from "@/lib/api/fetch";
// ── Types ─────────────────────────────────────────────────────────────────────

export type Jurisdiccion = {
  id: string;
  nombre: string | null;
  codigo: string | null;
  tipo: string;
};

// ── GET ALL ───────────────────────────────────────────────────────────────────

export async function getJurisdicciones(): Promise<Jurisdiccion[]> {
  const res = await apiFetch("/api/jurisdicciones");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener jurisdicciones");
  }
  return res.json();
}
