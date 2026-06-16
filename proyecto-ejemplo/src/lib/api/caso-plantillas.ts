import { apiFetch } from "@/lib/api/fetch";
export type PlantillaDisponibleItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  prioridad: number;
};

export async function getPlantillasDisponiblesForPractica(
  practicaId: string,
  options?: { includePlantillaId?: string | null },
): Promise<PlantillaDisponibleItem[]> {
  const params = new URLSearchParams({ practica_id: practicaId });

  if (options?.includePlantillaId) {
    params.set("include_plantilla_id", options.includePlantillaId);
  }

  const res = await apiFetch(
    `/api/casos/plantillas-disponibles?${params.toString()}`,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        "Error al obtener plantillas disponibles",
    );
  }

  return res.json();
}
