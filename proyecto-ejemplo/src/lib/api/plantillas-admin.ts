import { apiFetch } from "@/lib/api/fetch";
import type {
  PlantillaAdminDetail,
  PlantillaAdminListItem,
} from "@/lib/server/services/plantillas-admin.service";
import type {
  CreatePlantillaAdminInput,
  UpdatePlantillaAdminInput,
} from "@/lib/validation/schemas/plantilla-admin.schema";

export type { PlantillaAdminListItem, PlantillaAdminDetail };

export async function getPlantillaAdmin(
  id: string,
): Promise<PlantillaAdminDetail> {
  const res = await apiFetch(`/api/plantillas/${id}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener la plantilla",
    );
  }

  return res.json();
}

export async function createPlantillaAdmin(
  payload: CreatePlantillaAdminInput,
): Promise<{ plantilla_id: string }> {
  const res = await apiFetch("/api/plantillas", {
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

export async function updatePlantillaAdmin(
  id: string,
  payload: UpdatePlantillaAdminInput,
): Promise<{ plantilla_id: string }> {
  const res = await apiFetch(`/api/plantillas/${id}`, {
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

export async function setPlantillaActiva(
  id: string,
  activo: boolean,
): Promise<void> {
  const res = await apiFetch(`/api/plantillas/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ activo }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al actualizar el estado",
    );
  }
}
