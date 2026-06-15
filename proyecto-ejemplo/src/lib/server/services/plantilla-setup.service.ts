import type { ServerContext } from "@/lib/server/context/types";
import { plantillasRepository } from "@/BBDD/repositories/plantillas.repository";
import { plantillaCampoRepository } from "@/BBDD/repositories/plantilla-campo.repository";
import {
  reglasPlantillaRepository,
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
} from "@/BBDD/repositories/reglas-plantilla.repository";
import { camposDinamicosRepository } from "@/BBDD/repositories/campos-dinamicos.repository";
import { objetoRepository } from "@/BBDD/repositories/objeto.repository";
import { NotFoundError } from "../not-found-error";
import type {
  PlantillaSetupInput,
  PlantillaSetupExpedienteInput,
  UpdatePlantillaSetupInput,
  UpdatePlantillaSetupExpedienteInput,
} from "@/lib/validation/schemas/plantilla-setup.schema";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

const DEFAULT_PRIORIDAD = 100;

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

async function assertObjetoBelongsToFuero(
  ctx: Ctx,
  fueroId: string,
  objetoId: string,
) {
  const objeto = await objetoRepository.getById(ctx, objetoId);
  if (!objeto) {
    throw new Error("El objeto seleccionado no existe.");
  }
  if (objeto.fuero_id !== fueroId) {
    throw new Error("El objeto no corresponde al fuero seleccionado.");
  }
}

async function validateCamposCatalog(
  tctx: TenantCtx,
  contexto: string,
  campos: Array<{ campo_dinamico_id: string }>,
): Promise<void> {
  const campoIds = campos.map((c) => c.campo_dinamico_id);
  const uniqueIds = new Set(campoIds);
  if (uniqueIds.size !== campoIds.length) {
    throw new PlantillaSetupError("No se puede repetir el mismo campo.");
  }

  const catalogCampos = await camposDinamicosRepository.getActiveByIds(
    tctx,
    contexto,
    campoIds,
  );

  if (catalogCampos.length !== campoIds.length) {
    throw new PlantillaSetupError(
      "Uno o más campos no existen o no están activos.",
    );
  }
}

export class PlantillaSetupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PlantillaSetupError";
  }
}

export type PlantillaSetupDetail = {
  plantilla_id: string;
  contexto: string;
  regla: {
    practica_id?: string;
    fuero_id?: string;
    objeto_id?: string;
  };
  plantilla: {
    nombre: string;
    descripcion: string | null;
  };
  campos: Array<{
    campo_dinamico_id: string;
    etiqueta: string;
    tipo: string;
    orden: number;
    requerido: boolean;
  }>;
  prioridad: number;
};

export const plantillaSetupService = {
  async getForEditCaso(
    ctx: Ctx,
    plantillaId: string,
    practicaId: string,
  ): Promise<PlantillaSetupDetail> {
    const tctx = requireTenantCtx(ctx);

    const plantilla = await plantillasRepository.getActiveByIdForContexto(
      tctx,
      plantillaId,
      PLANTILLA_CONTEXTO_CASO,
    );

    if (!plantilla) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    const campos = await plantillaCampoRepository.getSetupLinksByPlantillaId(
      tctx,
      plantillaId,
    );

    const prioridad =
      (await reglasPlantillaRepository.getPrioridadForCasoRegla(
        tctx,
        practicaId,
        plantillaId,
      )) ?? DEFAULT_PRIORIDAD;

    return {
      plantilla_id: plantilla.id,
      contexto: PLANTILLA_CONTEXTO_CASO,
      regla: {
        practica_id: practicaId,
      },
      plantilla: {
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
      },
      campos,
      prioridad,
    };
  },

  async getForEditExpediente(
    ctx: Ctx,
    plantillaId: string,
    fueroId: string,
    objetoId: string,
  ): Promise<PlantillaSetupDetail> {
    const tctx = requireTenantCtx(ctx);

    await assertObjetoBelongsToFuero(ctx, fueroId, objetoId);

    const plantilla = await plantillasRepository.getActiveByIdForContexto(
      tctx,
      plantillaId,
      PLANTILLA_CONTEXTO_EXPEDIENTE,
    );

    if (!plantilla) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    const campos = await plantillaCampoRepository.getSetupLinksByPlantillaId(
      tctx,
      plantillaId,
    );

    const prioridad =
      (await reglasPlantillaRepository.getPrioridadForExpedienteRegla(
        tctx,
        fueroId,
        objetoId,
        plantillaId,
      )) ?? DEFAULT_PRIORIDAD;

    return {
      plantilla_id: plantilla.id,
      contexto: PLANTILLA_CONTEXTO_EXPEDIENTE,
      regla: {
        fuero_id: fueroId,
        objeto_id: objetoId,
      },
      plantilla: {
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
      },
      campos,
      prioridad,
    };
  },

  async createForCaso(
    ctx: Ctx,
    input: PlantillaSetupInput,
  ): Promise<{ plantilla_id: string; regla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    await validateCamposCatalog(tctx, PLANTILLA_CONTEXTO_CASO, input.campos);

    const plantillaId = await plantillasRepository.create(tctx, {
      nombre: input.plantilla.nombre,
      descripcion: input.plantilla.descripcion ?? null,
      contexto: PLANTILLA_CONTEXTO_CASO,
    });

    await plantillaCampoRepository.insertMany(tctx, plantillaId, input.campos);

    const reglaId = await reglasPlantillaRepository.upsertReglaForCaso(tctx, {
      practica_id: input.practica_id,
      plantilla_id: plantillaId,
      prioridad: input.prioridad,
    });

    return { plantilla_id: plantillaId, regla_id: reglaId };
  },

  async createForExpediente(
    ctx: Ctx,
    input: PlantillaSetupExpedienteInput,
  ): Promise<{ plantilla_id: string; regla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    await assertObjetoBelongsToFuero(ctx, input.fuero_id, input.objeto_id);
    await validateCamposCatalog(
      tctx,
      PLANTILLA_CONTEXTO_EXPEDIENTE,
      input.campos,
    );

    const plantillaId = await plantillasRepository.create(tctx, {
      nombre: input.plantilla.nombre,
      descripcion: input.plantilla.descripcion ?? null,
      contexto: PLANTILLA_CONTEXTO_EXPEDIENTE,
    });

    await plantillaCampoRepository.insertMany(tctx, plantillaId, input.campos);

    const reglaId = await reglasPlantillaRepository.upsertReglaForExpediente(
      tctx,
      {
        fuero_id: input.fuero_id,
        objeto_id: input.objeto_id,
        plantilla_id: plantillaId,
        prioridad: input.prioridad,
      },
    );

    return { plantilla_id: plantillaId, regla_id: reglaId };
  },

  async updateForCaso(
    ctx: Ctx,
    plantillaId: string,
    input: UpdatePlantillaSetupInput,
  ): Promise<{ plantilla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    const plantilla = await plantillasRepository.getByIdForTenant(
      tctx,
      plantillaId,
    );

    if (!plantilla || plantilla.contexto !== PLANTILLA_CONTEXTO_CASO) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    await validateCamposCatalog(tctx, PLANTILLA_CONTEXTO_CASO, input.campos);

    await plantillasRepository.update(tctx, plantillaId, {
      nombre: input.plantilla.nombre,
      descripcion: input.plantilla.descripcion ?? null,
    });

    await plantillaCampoRepository.replaceForPlantilla(
      tctx,
      plantillaId,
      input.campos,
    );

    await reglasPlantillaRepository.upsertReglaForCaso(tctx, {
      practica_id: input.practica_id,
      plantilla_id: plantillaId,
      prioridad: input.prioridad,
    });

    return { plantilla_id: plantillaId };
  },

  async updateForExpediente(
    ctx: Ctx,
    plantillaId: string,
    input: UpdatePlantillaSetupExpedienteInput,
  ): Promise<{ plantilla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    await assertObjetoBelongsToFuero(ctx, input.fuero_id, input.objeto_id);

    const plantilla = await plantillasRepository.getByIdForTenant(
      tctx,
      plantillaId,
    );

    if (!plantilla || plantilla.contexto !== PLANTILLA_CONTEXTO_EXPEDIENTE) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    await validateCamposCatalog(
      tctx,
      PLANTILLA_CONTEXTO_EXPEDIENTE,
      input.campos,
    );

    await plantillasRepository.update(tctx, plantillaId, {
      nombre: input.plantilla.nombre,
      descripcion: input.plantilla.descripcion ?? null,
    });

    await plantillaCampoRepository.replaceForPlantilla(
      tctx,
      plantillaId,
      input.campos,
    );

    await reglasPlantillaRepository.upsertReglaForExpediente(tctx, {
      fuero_id: input.fuero_id,
      objeto_id: input.objeto_id,
      plantilla_id: plantillaId,
      prioridad: input.prioridad,
    });

    return { plantilla_id: plantillaId };
  },

  /** @deprecated Usar createForCaso. Mantenido para compatibilidad con API legacy. */
  async createFromCasoFlow(ctx: Ctx, input: PlantillaSetupInput) {
    return plantillaSetupService.createForCaso(ctx, input);
  },

  /** @deprecated Usar updateForCaso. Mantenido para compatibilidad con API legacy. */
  async updateFromCasoFlow(
    ctx: Ctx,
    plantillaId: string,
    input: UpdatePlantillaSetupInput,
  ) {
    return plantillaSetupService.updateForCaso(ctx, plantillaId, input);
  },

  /** @deprecated Usar getForEditCaso. Mantenido para compatibilidad con API legacy. */
  async getForEdit(
    ctx: Ctx,
    plantillaId: string,
    practicaId: string,
  ) {
    return plantillaSetupService.getForEditCaso(
      ctx,
      plantillaId,
      practicaId,
    );
  },
};
