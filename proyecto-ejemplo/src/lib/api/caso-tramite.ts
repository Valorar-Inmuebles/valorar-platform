import { apiFetch } from "@/lib/api/fetch";
import type { CasoTramitePlantillaCamposResponse } from "@/lib/server/services/caso-tramite.types";

export type {
  CasoTramiteCampoDto,
  CasoTramiteCampoOpcionDto,
  CasoTramitePlantillaCamposResponse,
  CasoTramiteWithValoresResponse,
} from "@/lib/server/services/caso-tramite.types";

export async function getPlantillaCampos(
  practicaId: string,
  plantillaId?: string | null,
): Promise<CasoTramitePlantillaCamposResponse> {
  const params = new URLSearchParams({
    practica_id: practicaId,
  });

  if (plantillaId) {
    params.set("plantilla_id", plantillaId);
  }

  const res = await apiFetch(`/api/casos/plantilla-campos?${params.toString()}`);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener campos del trámite",
    );
  }

  return res.json();
}

export async function getCasoTramite(
  casoId: string,
  plantillaId?: string | null,
) {
  const params = new URLSearchParams();
  if (plantillaId) {
    params.set("plantilla_id", plantillaId);
  }

  const qs = params.toString();
  const url = qs
    ? `/api/casos/${casoId}/tramite?${qs}`
    : `/api/casos/${casoId}/tramite`;

  const res = await apiFetch(url);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: string }).error ?? "Error al obtener trámite del caso",
    );
  }

  return res.json();
}
