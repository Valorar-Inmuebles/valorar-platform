import type { ServerContext } from "@/lib/server/context/types";
import {
  plantillasRepository,
  type PlantillaAdminListItem,
} from "@/BBDD/repositories/plantillas.repository";
import { reglasPlantillaRepository } from "@/BBDD/repositories/reglas-plantilla.repository";
import { plantillaCampoRepository } from "@/BBDD/repositories/plantilla-campo.repository";
import { plantillaSetupService } from "./plantilla-setup.service";
import {
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
} from "@/BBDD/repositories/reglas-plantilla.repository";
import { NotFoundError } from "../not-found-error";
import type {
  CreatePlantillaAdminInput,
  UpdatePlantillaAdminInput,
} from "@/lib/validation/schemas/plantilla-admin.schema";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

function pickNombre(
  row: { nombre: string | null } | null | undefined,
): string {
  return row?.nombre?.trim() || "—";
}

function formatReglaResumen(
  contexto: string,
  reglas: Array<{
    activo: boolean;
    prioridad: number;
    jurisdiccion: { nombre: string | null } | null;
    practica: { nombre: string } | null;
    fuero: { nombre: string } | null;
    objeto: { nombre: string } | null;
  }> | null,
): string {
  const active = (reglas ?? []).filter((r) => r.activo);
  if (active.length === 0) return "—";
  if (active.length > 1) return `${active.length} reglas`;

  const r = active[0];
  if (contexto === PLANTILLA_CONTEXTO_CASO) {
    return pickNombre(r.practica);
  }
  return `${pickNombre(r.fuero)} · ${pickNombre(r.objeto)}`;
}

function mapListRow(
  raw: Awaited<ReturnType<typeof plantillasRepository.listForAdmin>>[number],
): PlantillaAdminListItem {
  const camposCount = raw.campos?.[0]?.count ?? 0;

  return {
    id: raw.id,
    nombre: raw.nombre,
    contexto: raw.contexto,
    activo: raw.activo,
    updated_at: raw.updated_at,
    regla_resumen: formatReglaResumen(raw.contexto, raw.reglas),
    campos_count: camposCount,
  };
}

export type PlantillaAdminDetail = {
  id: string;
  nombre: string;
  descripcion: string | null;
  contexto: string;
  activo: boolean;
  practica_id?: string;
  fuero_id?: string;
  objeto_id?: string;
  prioridad: number;
  campos: Array<{
    campo_dinamico_id: string;
    etiqueta: string;
    tipo: string;
    orden: number;
    requerido: boolean;
  }>;
};

export type { PlantillaAdminListItem };

export const plantillasAdminService = {
  async listForAdmin(ctx: Ctx): Promise<PlantillaAdminListItem[]> {
    const tctx = requireTenantCtx(ctx);
    const rows = await plantillasRepository.listForAdmin(tctx);
    return rows.map(mapListRow);
  },

  async getDetail(ctx: Ctx, plantillaId: string): Promise<PlantillaAdminDetail> {
    const tctx = requireTenantCtx(ctx);

    const plantilla = await plantillasRepository.getByIdForTenant(
      tctx,
      plantillaId,
    );

    if (!plantilla) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    const campos = await plantillaCampoRepository.getSetupLinksByPlantillaId(
      tctx,
      plantillaId,
    );

    const reglas = await reglasPlantillaRepository.listActiveByPlantillaId(
      tctx,
      plantillaId,
    );

    const primaryRegla = reglas[0];
    const prioridad = primaryRegla?.prioridad ?? 100;

    const base: PlantillaAdminDetail = {
      id: plantilla.id,
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      contexto: plantilla.contexto,
      activo: plantilla.activo,
      prioridad,
      campos,
    };

    if (plantilla.contexto === PLANTILLA_CONTEXTO_CASO) {
      return {
        ...base,
        practica_id: primaryRegla?.practica_id ?? undefined,
      };
    }

    if (plantilla.contexto === PLANTILLA_CONTEXTO_EXPEDIENTE) {
      return {
        ...base,
        fuero_id: primaryRegla?.fuero_id ?? undefined,
        objeto_id: primaryRegla?.objeto_id ?? undefined,
      };
    }

    return base;
  },

  async create(
    ctx: Ctx,
    input: CreatePlantillaAdminInput,
  ): Promise<{ plantilla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    if (input.contexto === PLANTILLA_CONTEXTO_CASO) {
      const result = await plantillaSetupService.createForCaso(ctx, {
        practica_id: input.practica_id,
        plantilla: {
          nombre: input.nombre,
          descripcion: input.descripcion,
        },
        campos: input.campos,
        prioridad: input.prioridad,
      });

      if (!input.activo) {
        await plantillasRepository.update(tctx, result.plantilla_id, {
          nombre: input.nombre,
          descripcion: input.descripcion ?? null,
          activo: false,
        });
      }

      return { plantilla_id: result.plantilla_id };
    }

    const result = await plantillaSetupService.createForExpediente(ctx, {
      fuero_id: input.fuero_id,
      objeto_id: input.objeto_id,
      plantilla: {
        nombre: input.nombre,
        descripcion: input.descripcion,
      },
      campos: input.campos,
      prioridad: input.prioridad,
    });

    if (!input.activo) {
      await plantillasRepository.update(tctx, result.plantilla_id, {
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        activo: false,
      });
    }

    return { plantilla_id: result.plantilla_id };
  },

  async update(
    ctx: Ctx,
    plantillaId: string,
    input: UpdatePlantillaAdminInput,
  ): Promise<{ plantilla_id: string }> {
    const tctx = requireTenantCtx(ctx);

    const existing = await plantillasRepository.getByIdForTenant(
      tctx,
      plantillaId,
    );

    if (!existing) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    if (existing.contexto !== input.contexto) {
      throw new Error("No se puede cambiar el contexto de una plantilla.");
    }

    if (input.contexto === PLANTILLA_CONTEXTO_CASO) {
      await plantillasRepository.update(tctx, plantillaId, {
        nombre: input.nombre,
        descripcion: input.descripcion ?? null,
        activo: input.activo,
      });

      await plantillaSetupService.updateForCaso(ctx, plantillaId, {
        practica_id: input.practica_id,
        plantilla: {
          nombre: input.nombre,
          descripcion: input.descripcion,
        },
        campos: input.campos,
        prioridad: input.prioridad,
      });

      return { plantilla_id: plantillaId };
    }

    await plantillasRepository.update(tctx, plantillaId, {
      nombre: input.nombre,
      descripcion: input.descripcion ?? null,
      activo: input.activo,
    });

    await plantillaSetupService.updateForExpediente(ctx, plantillaId, {
      fuero_id: input.fuero_id,
      objeto_id: input.objeto_id,
      plantilla: {
        nombre: input.nombre,
        descripcion: input.descripcion,
      },
      campos: input.campos,
      prioridad: input.prioridad,
    });

    return { plantilla_id: plantillaId };
  },

  async setActivo(
    ctx: Ctx,
    plantillaId: string,
    activo: boolean,
  ): Promise<void> {
    const tctx = requireTenantCtx(ctx);
    const plantilla = await plantillasRepository.getByIdForTenant(
      tctx,
      plantillaId,
    );

    if (!plantilla) {
      throw new NotFoundError("Plantilla no encontrada");
    }

    await plantillasRepository.update(tctx, plantillaId, {
      nombre: plantilla.nombre,
      descripcion: plantilla.descripcion,
      activo,
    });
  },
};
