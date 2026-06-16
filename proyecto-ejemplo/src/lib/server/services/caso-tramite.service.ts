import type { ServerContext } from "@/lib/server/context/types";
import { NotFoundError } from "../not-found-error";
import { reglasPlantillaRepository } from "@/BBDD/repositories/reglas-plantilla.repository";
import { plantillaCampoRepository } from "@/BBDD/repositories/plantilla-campo.repository";
import { plantillasRepository } from "@/BBDD/repositories/plantillas.repository";
import { valoresDinamicosRepository } from "@/BBDD/repositories/valores-dinamicos.repository";
import { casoRepository } from "@/BBDD/repositories/caso.repository";
import {
  mapRowsToValoresRecord,
  buildDefaultRuntimeValue,
} from "./caso-tramite-valores.service";
import type {
  CasoTramitePlantillaCamposResponse,
  CasoTramiteWithValoresResponse,
} from "./caso-tramite.types";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

type ResolvePlantillaOptions = {
  storedPlantillaId?: string | null;
  plantillaIdOverride?: string | null;
};

const CASO_CONTEXTO = "caso";
const CASO_ENTIDAD = "caso";

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

async function loadCamposForPlantillaId(
  tctx: TenantCtx,
  plantillaId: string,
): Promise<CasoTramitePlantillaCamposResponse["campos"]> {
  return plantillaCampoRepository.getCamposByPlantillaId(tctx, plantillaId);
}

async function resolvePlantillaCamposFromStored(
  tctx: TenantCtx,
  practicaId: string,
  storedPlantillaId: string,
): Promise<CasoTramitePlantillaCamposResponse> {
  const suggestedPlantillaId =
    await reglasPlantillaRepository.resolvePlantillaIdForCasoByPractica(
      tctx,
      practicaId,
    );

  const plantilla = await plantillasRepository.getByIdForContexto(
    tctx,
    storedPlantillaId,
    CASO_CONTEXTO,
  );

  if (!plantilla) {
    return {
      suggested_plantilla_id: suggestedPlantillaId,
      effective_plantilla_id: null,
      campos: [],
    };
  }

  const campos = await loadCamposForPlantillaId(tctx, plantilla.id);

  return {
    suggested_plantilla_id: suggestedPlantillaId,
    effective_plantilla_id: plantilla.id,
    campos,
  };
}

async function resolvePlantillaCamposByReglas(
  tctx: TenantCtx,
  practicaId: string,
  plantillaIdOverride?: string | null,
): Promise<CasoTramitePlantillaCamposResponse> {
  const suggestedPlantillaId =
    await reglasPlantillaRepository.resolvePlantillaIdForCasoByPractica(
      tctx,
      practicaId,
    );

  let effectivePlantillaId: string | null = suggestedPlantillaId;

  if (plantillaIdOverride) {
    const plantilla = await plantillasRepository.getActiveByIdForContexto(
      tctx,
      plantillaIdOverride,
      CASO_CONTEXTO,
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

  const campos = await loadCamposForPlantillaId(tctx, effectivePlantillaId);

  return {
    suggested_plantilla_id: suggestedPlantillaId,
    effective_plantilla_id: effectivePlantillaId,
    campos,
  };
}

async function resolvePlantillaCampos(
  tctx: TenantCtx,
  practicaId: string,
  options?: ResolvePlantillaOptions,
): Promise<CasoTramitePlantillaCamposResponse> {
  if (options?.storedPlantillaId) {
    return resolvePlantillaCamposFromStored(
      tctx,
      practicaId,
      options.storedPlantillaId,
    );
  }

  return resolvePlantillaCamposByReglas(
    tctx,
    practicaId,
    options?.plantillaIdOverride,
  );
}

export const casoTramiteService = {
  async getPlantillaCampos(
    ctx: Ctx,
    practicaId: string,
    plantillaIdOverride?: string | null,
  ): Promise<CasoTramitePlantillaCamposResponse> {
    const tctx = requireTenantCtx(ctx);
    return resolvePlantillaCampos(tctx, practicaId, {
      plantillaIdOverride,
    });
  },

  async resolveEffectivePlantillaId(
    ctx: Ctx,
    practicaId: string,
    plantillaIdOverride?: string | null,
  ): Promise<string | null> {
    const tramite = await this.getPlantillaCampos(
      ctx,
      practicaId,
      plantillaIdOverride,
    );
    return tramite.effective_plantilla_id;
  },

  async getTramiteWithValores(
    ctx: Ctx,
    casoId: string,
    plantillaIdOverride?: string | null,
  ): Promise<CasoTramiteWithValoresResponse> {
    const tctx = requireTenantCtx(ctx);
    const caso = await casoRepository.getById(tctx, casoId);

    if (!caso.practica_id) {
      return {
        suggested_plantilla_id: null,
        effective_plantilla_id: null,
        campos: [],
        valores: {},
      };
    }

    const tramite = await resolvePlantillaCampos(tctx, caso.practica_id, {
      storedPlantillaId: caso.plantilla_id,
      plantillaIdOverride: caso.plantilla_id ? undefined : plantillaIdOverride,
    });

    const rows = await valoresDinamicosRepository.getByEntidad(
      tctx,
      CASO_ENTIDAD,
      casoId,
    );

    const valores =
      tramite.campos.length > 0
        ? mapRowsToValoresRecord(tramite.campos, rows)
        : {};

    for (const campo of tramite.campos) {
      if (!(campo.campo_id in valores)) {
        valores[campo.campo_id] = buildDefaultRuntimeValue(campo);
      }
    }

    return {
      ...tramite,
      valores,
    };
  },

  async resolveCamposForPersist(
    ctx: Ctx,
    practicaId: string,
    options?: ResolvePlantillaOptions,
  ) {
    const tctx = requireTenantCtx(ctx);
    const tramite = await resolvePlantillaCampos(tctx, practicaId, options);

    if (!tramite.effective_plantilla_id || tramite.campos.length === 0) {
      throw new NotFoundError(
        "No hay plantilla activa con campos para esta práctica.",
      );
    }

    return tramite;
  },
};
