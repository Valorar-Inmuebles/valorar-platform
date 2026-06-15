import type { ServerContext } from "@/lib/server/context/types";
import {
  plantillasRepository,
  type PlantillaListItem,
} from "@/BBDD/repositories/plantillas.repository";
import {
  reglasPlantillaRepository,
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
} from "@/BBDD/repositories/reglas-plantilla.repository";
import { plantillaCampoRepository } from "@/BBDD/repositories/plantilla-campo.repository";
import type { CasoTramitePlantillaCamposResponse } from "./caso-tramite.types";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

async function resolvePlantillaCampos(
  tctx: TenantCtx,
  contexto: string,
  suggestedPlantillaId: string | null,
  plantillaIdOverride?: string | null,
): Promise<CasoTramitePlantillaCamposResponse> {
  let effectivePlantillaId: string | null = suggestedPlantillaId;

  if (plantillaIdOverride) {
    const plantilla = await plantillasRepository.getActiveByIdForContexto(
      tctx,
      plantillaIdOverride,
      contexto,
    );
    if (!plantilla) {
      throw new Error("La plantilla seleccionada no existe o no está activa.");
    }
    effectivePlantillaId = plantilla.id;
  }

  if (!effectivePlantillaId) {
    return {
      suggested_plantilla_id: suggestedPlantillaId,
      effective_plantilla_id: null,
      campos: [],
    };
  }

  const campos = await plantillaCampoRepository.getCamposByPlantillaId(
    tctx,
    effectivePlantillaId,
  );

  return {
    suggested_plantilla_id: suggestedPlantillaId,
    effective_plantilla_id: effectivePlantillaId,
    campos,
  };
}

export type { PlantillaListItem };
export type PlantillaCamposResponse = CasoTramitePlantillaCamposResponse;

export const plantillasService = {
  async listByContexto(ctx: Ctx, contexto: string): Promise<PlantillaListItem[]> {
    const tctx = requireTenantCtx(ctx);
    return plantillasRepository.listActiveByContexto(tctx, contexto);
  },

  async resolveCamposForCaso(
    ctx: Ctx,
    practicaId: string,
    plantillaIdOverride?: string | null,
  ): Promise<PlantillaCamposResponse> {
    const tctx = requireTenantCtx(ctx);
    const suggestedPlantillaId =
      await reglasPlantillaRepository.resolvePlantillaIdForCasoByPractica(
        tctx,
        practicaId,
      );

    return resolvePlantillaCampos(
      tctx,
      PLANTILLA_CONTEXTO_CASO,
      suggestedPlantillaId,
      plantillaIdOverride,
    );
  },

  async resolveCamposForExpediente(
    ctx: Ctx,
    fueroId: string,
    objetoId: string,
    plantillaIdOverride?: string | null,
  ): Promise<PlantillaCamposResponse> {
    const tctx = requireTenantCtx(ctx);
    const suggestedPlantillaId =
      await reglasPlantillaRepository.resolvePlantillaIdForExpediente(
        tctx,
        fueroId,
        objetoId,
      );

    return resolvePlantillaCampos(
      tctx,
      PLANTILLA_CONTEXTO_EXPEDIENTE,
      suggestedPlantillaId,
      plantillaIdOverride,
    );
  },
};
