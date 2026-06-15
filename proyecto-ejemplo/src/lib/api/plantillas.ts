import { apiFetch } from "@/lib/api/fetch";
import type { PlantillaListItem } from "@/lib/server/services/plantillas.service";
import type { PlantillaCamposResponse } from "@/lib/server/services/plantillas.service";

export type { PlantillaListItem, PlantillaCamposResponse };

export async function getPlantillas(
  contexto: string,
): Promise<PlantillaListItem[]> {
  const params = new URLSearchParams({ contexto });
  const res = await apiFetch(`/api/plantillas?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener plantillas",
    );
  }

  return res.json();
}

export async function getPlantillaCamposForCaso(
  practicaId: string,
  plantillaId?: string | null,
): Promise<PlantillaCamposResponse> {
  const params = new URLSearchParams({
    contexto: "caso",
    practica_id: practicaId,
  });

  if (plantillaId) {
    params.set("plantilla_id", plantillaId);
  }

  const res = await apiFetch(`/api/plantillas/campos?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        "Error al obtener campos de la plantilla",
    );
  }

  return res.json();
}

export async function getPlantillaCamposForExpediente(
  fueroId: string,
  objetoId: string,
  plantillaId?: string | null,
): Promise<PlantillaCamposResponse> {
  const params = new URLSearchParams({
    contexto: "expediente",
    fuero_id: fueroId,
    objeto_id: objetoId,
  });

  if (plantillaId) {
    params.set("plantilla_id", plantillaId);
  }

  const res = await apiFetch(`/api/plantillas/campos?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ??
        "Error al obtener campos de la plantilla",
    );
  }

  return res.json();
}
