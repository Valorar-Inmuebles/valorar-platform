import type { ServerContext } from "@/lib/server/context/types";
import {
  reglasPlantillaRepository,
  PLANTILLA_CONTEXTO_CASO,
  type PlantillaForPracticaItem,
} from "@/BBDD/repositories/reglas-plantilla.repository";
import { plantillasRepository } from "@/BBDD/repositories/plantillas.repository";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

export type { PlantillaForPracticaItem };

export const casoPlantillasService = {
  async listDisponiblesForPractica(
    ctx: Ctx,
    practicaId: string,
    options?: { includePlantillaId?: string | null },
  ): Promise<PlantillaForPracticaItem[]> {
    const tctx = requireTenantCtx(ctx);
    const items = await reglasPlantillaRepository.listPlantillasForPractica(
      tctx,
      practicaId,
    );

    const includeId = options?.includePlantillaId?.trim();
    if (!includeId || items.some((item) => item.id === includeId)) {
      return items;
    }

    const plantilla = await plantillasRepository.getByIdForContexto(
      tctx,
      includeId,
      PLANTILLA_CONTEXTO_CASO,
    );

    if (!plantilla) {
      return items;
    }

    return [
      ...items,
      {
        id: plantilla.id,
        nombre: plantilla.nombre,
        descripcion: plantilla.descripcion,
        prioridad: 0,
      },
    ];
  },
};
