import { formatPersonaDisplayName } from "@/lib/persona-display";
import type { ServerContext } from "@/lib/server/context/types";
import {
  casoRepository,
  type CasoListQueryRow,
} from "@/BBDD/repositories/caso.repository";
import { NotFoundError } from "../not-found-error";
import { expedienteRepository } from "@/BBDD/repositories/expediente.repository";
import { casoTramiteService } from "./caso-tramite.service";
import { casoPlantillasService } from "./caso-plantillas.service";
import {
  CASO_ESTADO_INICIAL,
  CASO_EXPEDIENTE_EDIT_LOCK_ENABLED,
} from "./caso.constants";
import {
  casoTramiteValoresService,
  CasoTramiteValoresValidationError,
  type ValorDinamicoInput,
} from "./caso-tramite-valores.service";

type Ctx = ServerContext;

type CasoRepoCtx = { tenant_id: string; is_superadmin?: boolean };

export type CasoListItem = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  estado: string | null;
  nombre: string | null;
  practica_id: string;
  created_at: string | null;
  numero: string | null;
  cliente: { nombre: string };
  practica: { nombre: string };
};

function requireTenantCtx(ctx: Ctx): CasoRepoCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

export class CasoFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CasoFieldError";
  }
}

export { CasoTramiteValoresValidationError };
export type { ValorDinamicoInput };

function pickPersona(
  row: CasoListQueryRow["cliente"],
): {
  tipo: string | null;
  nombre: string | null;
  apellido: string | null;
} | null {
  const persona = row?.persona;
  if (!persona) return null;
  if (Array.isArray(persona)) return persona[0] ?? null;
  return persona;
}

function displayClienteNombre(
  row: CasoListQueryRow["cliente"],
): string {
  return formatPersonaDisplayName(pickPersona(row));
}

function mapCasoListQueryRow(raw: CasoListQueryRow): CasoListItem {
  const practicaNombre = raw.practica?.nombre?.trim() || "—";

  return {
    id: raw.id,
    tenant_id: raw.tenant_id,
    cliente_id: raw.cliente_id,
    estado: raw.estado,
    nombre: raw.nombre,
    practica_id: raw.practica_id,
    created_at: raw.created_at,
    numero: raw.numero ?? null,
    cliente: { nombre: displayClienteNombre(raw.cliente) },
    practica: { nombre: practicaNombre },
  };
}

const CASO_HAS_EXPEDIENTES_MESSAGE =
  "Este caso posee expedientes asociados. Solo es posible modificar el título y el estado.";

function payloadFieldChanged(
  current: string | null,
  next: string | null | undefined,
): boolean {
  if (next === undefined) return false;
  return (current ?? "") !== (next ?? "");
}

type CasoPersistOptions = {
  valores_dinamicos?: ValorDinamicoInput[];
  tramite_plantilla_id?: string | null;
};

function resolveExplicitPlantillaId(
  options?: CasoPersistOptions,
): string | null | undefined {
  return options?.tramite_plantilla_id;
}

async function assertPlantillaDisponibleForPractica(
  ctx: Ctx,
  practicaId: string,
  plantillaId: string,
): Promise<void> {
  const disponibles = await casoPlantillasService.listDisponiblesForPractica(
    ctx,
    practicaId,
  );

  if (!disponibles.some((item) => item.id === plantillaId)) {
    throw new CasoFieldError(
      "La plantilla seleccionada no está disponible para esta práctica.",
      "plantilla_id",
      "PLANTILLA_NOT_AVAILABLE",
    );
  }
}

async function resolvePlantillaIdForCreate(
  ctx: Ctx,
  practicaId: string,
  explicitPlantillaId?: string | null,
): Promise<string | null> {
  const disponibles = await casoPlantillasService.listDisponiblesForPractica(
    ctx,
    practicaId,
  );

  if (explicitPlantillaId) {
    await assertPlantillaDisponibleForPractica(
      ctx,
      practicaId,
      explicitPlantillaId,
    );
    return explicitPlantillaId;
  }

  if (disponibles.length === 1) {
    return disponibles[0].id;
  }

  if (disponibles.length > 1) {
    throw new CasoFieldError(
      "Seleccioná una plantilla para esta práctica.",
      "plantilla_id",
      "PLANTILLA_REQUIRED",
    );
  }

  return null;
}

async function persistTramiteValores(
  ctx: Ctx,
  casoId: string,
  practicaId: string,
  storedPlantillaId: string | null,
  options?: CasoPersistOptions,
): Promise<void> {
  if (!options?.valores_dinamicos) return;

  let tramite;
  try {
    tramite = await casoTramiteService.resolveCamposForPersist(ctx, practicaId, {
      storedPlantillaId,
      plantillaIdOverride: storedPlantillaId
        ? undefined
        : options.tramite_plantilla_id,
    });
  } catch (error) {
    if (error instanceof NotFoundError) return;
    throw error;
  }

  const tctx = requireTenantCtx(ctx);
  await casoTramiteValoresService.persistForCaso(
    tctx,
    casoId,
    tramite.campos,
    options.valores_dinamicos,
  );
}

export const casoService = {
  async getAll(ctx: Ctx): Promise<CasoListItem[]> {
    const tctx = requireTenantCtx(ctx);
    const rows = await casoRepository.getAll(tctx);
    return rows.map(mapCasoListQueryRow);
  },

  async getById(ctx: Ctx, id: string) {
    const tctx = requireTenantCtx(ctx);
    const caso = await casoRepository.getById(tctx, id);
    const expedienteCount = await expedienteRepository.countByCaso(tctx, id);

    return {
      ...caso,
      has_expedientes:
        CASO_EXPEDIENTE_EDIT_LOCK_ENABLED && expedienteCount > 0,
    };
  },

  async create(
    ctx: Ctx,
    payload: {
      cliente_id: string;
      nombre: string;
      descripcion?: string | null;
      practica_id: string;
    },
    options?: CasoPersistOptions,
  ) {
    const tctx = requireTenantCtx(ctx);

    const explicitPlantillaId = resolveExplicitPlantillaId(options);

    const plantillaId = await resolvePlantillaIdForCreate(
      ctx,
      payload.practica_id,
      explicitPlantillaId,
    );

    const caso = await casoRepository.create(tctx, {
      cliente_id: payload.cliente_id,
      nombre: payload.nombre,
      descripcion: payload.descripcion ?? null,
      estado: CASO_ESTADO_INICIAL,
      practica_id: payload.practica_id,
      plantilla_id: plantillaId,
    });

    await persistTramiteValores(
      ctx,
      caso.id,
      payload.practica_id,
      plantillaId,
      options,
    );

    return caso;
  },

  async update(
    ctx: Ctx,
    id: string,
    payload: {
      cliente_id?: string;
      nombre?: string | null;
      descripcion?: string | null;
      practica_id?: string | null;
    },
    options?: CasoPersistOptions,
  ) {
    const tctx = requireTenantCtx(ctx);
    const current = await casoRepository.getById(tctx, id);
    const hasExpedientes =
      CASO_EXPEDIENTE_EDIT_LOCK_ENABLED &&
      (await expedienteRepository.countByCaso(tctx, id)) > 0;

    if (hasExpedientes) {
      const restrictedFieldChanged =
        payloadFieldChanged(current.cliente_id, payload.cliente_id) ||
        payloadFieldChanged(current.practica_id, payload.practica_id);

      if (restrictedFieldChanged) {
        throw new CasoFieldError(
          CASO_HAS_EXPEDIENTES_MESSAGE,
          "cliente_id",
          "CASO_HAS_EXPEDIENTES",
        );
      }

      await casoRepository.update(tctx, id, {
        nombre: payload.nombre,
        descripcion: payload.descripcion,
      });
      await persistTramiteValores(
        ctx,
        id,
        current.practica_id,
        current.plantilla_id,
        options,
      );
      return;
    }

    const practicaId = payload.practica_id ?? current.practica_id;
    const explicitPlantillaId = resolveExplicitPlantillaId(options);

    let effectivePlantillaId = current.plantilla_id;

    if (explicitPlantillaId && explicitPlantillaId !== current.plantilla_id) {
      await assertPlantillaDisponibleForPractica(
        ctx,
        practicaId,
        explicitPlantillaId,
      );
      effectivePlantillaId = explicitPlantillaId;
    }

    const updatePayload: {
      cliente_id?: string;
      nombre?: string | null;
      descripcion?: string | null;
      practica_id?: string;
      plantilla_id?: string | null;
    } = {};

    if (payload.cliente_id !== undefined) {
      updatePayload.cliente_id = payload.cliente_id;
    }
    if (payload.nombre !== undefined) {
      updatePayload.nombre = payload.nombre;
    }
    if (payload.descripcion !== undefined) {
      updatePayload.descripcion = payload.descripcion ?? null;
    }
    if (payload.practica_id != null) {
      updatePayload.practica_id = payload.practica_id;
    }
    if (effectivePlantillaId !== current.plantilla_id) {
      updatePayload.plantilla_id = effectivePlantillaId;
    }

    await casoRepository.update(tctx, id, updatePayload);

    await persistTramiteValores(
      ctx,
      id,
      practicaId,
      effectivePlantillaId,
      options,
    );
  },

  async delete(ctx: Ctx, id: string) {
    const tctx = requireTenantCtx(ctx);
    return casoRepository.delete(tctx, id);
  },
};
