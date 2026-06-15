import { apiFetch } from "@/lib/api/fetch";
export type Objeto = {
  id: string;
  fuero_id: string;
  nombre: string;
};

export async function getObjetosByFuero(fueroId: string): Promise<Objeto[]> {
  const params = new URLSearchParams({ fuero_id: fueroId });
  const res = await apiFetch(`/api/objetos?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener objetos");
  }
  return res.json();
}
