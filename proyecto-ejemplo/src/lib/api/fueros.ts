import { apiFetch } from "@/lib/api/fetch";
export type Fuero = {
  id: string;
  nombre: string;
};

export async function getFueros(): Promise<Fuero[]> {
  const res = await apiFetch("/api/fueros");
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error ?? "Error al obtener fueros");
  }
  return res.json();
}
