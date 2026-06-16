import { apiFetch } from "@/lib/api/fetch";
// ── Types ─────────────────────────────────────────────────────────────────────

export type Practica = {
  id: string;
  nombre: string;
  codigo: string;
  descripcion: string | null;
  orden: number | null;
};

// ── GET ALL ───────────────────────────────────────────────────────────────────

export async function getPracticas(): Promise<Practica[]> {
  const res = await apiFetch("/api/practicas");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener prácticas");
  }
  return res.json();
}
