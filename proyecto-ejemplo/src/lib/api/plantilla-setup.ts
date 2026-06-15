import { apiFetch } from "@/lib/api/fetch";
import type {
  PlantillaSetupInput,
  UpdatePlantillaSetupInput,
} from "@/lib/validation/schemas/plantilla-setup.schema";
import type { PlantillaSetupDetail } from "@/lib/server/services/plantilla-setup.service";

export type PlantillaSetupResult = {
  plantilla_id: string;
  regla_id: string;
};

export type { PlantillaSetupDetail };

export async function createPlantillaSetup(
  payload: PlantillaSetupInput,
): Promise<PlantillaSetupResult> {
  const res = await apiFetch("/api/casos/plantilla-setup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al crear la plantilla",
    );
  }

  return res.json();
}

export async function getPlantillaSetup(
  plantillaId: string,
  practicaId: string,
): Promise<PlantillaSetupDetail> {
  const params = new URLSearchParams({
    practica_id: practicaId,
  });

  const res = await apiFetch(
    `/api/casos/plantilla-setup/${plantillaId}?${params.toString()}`,
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al cargar la plantilla",
    );
  }

  return res.json();
}

export async function updatePlantillaSetup(
  plantillaId: string,
  payload: UpdatePlantillaSetupInput,
): Promise<{ plantilla_id: string }> {
  const res = await apiFetch(`/api/casos/plantilla-setup/${plantillaId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al actualizar la plantilla",
    );
  }

  return res.json();
}
