import type { ServerContext } from "@/lib/server/context/types";
import {
  camposDinamicosRepository,
  type CampoDinamicoAdminListItem,
  type CampoDinamicoDetail,
  type CampoDinamicoListItem,
  type CampoDinamicoWritePayload,
} from "@/BBDD/repositories/campos-dinamicos.repository";
import { NotFoundError } from "../not-found-error";
import {
  isCampoDinamicoOptionTipo,
  type CreateCampoDinamicoInput,
  type UpdateCampoDinamicoInput,
} from "@/lib/validation/schemas/campo-dinamico.schema";

type Ctx = ServerContext;

type TenantCtx = { tenant_id: string; is_superadmin?: boolean };

function requireTenantCtx(ctx: Ctx): TenantCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

export class CampoDinamicoFieldError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "CampoDinamicoFieldError";
  }
}

export type { CampoDinamicoListItem, CampoDinamicoAdminListItem, CampoDinamicoDetail };
export {
  mapCampoDinamicoToRuntimeMetadata,
  type CampoDinamicoRuntimeMetadata,
} from "./campo-dinamico-runtime.types";

function normalizeTipo(tipo: string): string {
  const t = tipo.trim().toLowerCase();
  if (t === "fecha") return "date";
  if (t === "numero") return "number";
  if (t === "bool") return "boolean";
  return t;
}

function normalizeClave(clave: string): string {
  return clave.trim().toLowerCase();
}

async function assertClaveUnique(
  tctx: TenantCtx,
  contexto: string,
  clave: string,
  excludeId?: string,
): Promise<void> {
  const dup = await camposDinamicosRepository.findByClave(
    tctx,
    contexto,
    clave,
    excludeId,
  );
  if (dup) {
    throw new CampoDinamicoFieldError(
      "Ya existe un campo con esa clave en este contexto.",
      "clave",
      "DUPLICATE_CLAVE",
    );
  }
}

async function countReferencias(
  tctx: TenantCtx,
  campoId: string,
): Promise<number> {
  const [plantillaCount, valorCount] = await Promise.all([
    camposDinamicosRepository.countPlantillaReferencias(tctx, campoId),
    camposDinamicosRepository.countValorReferencias(tctx, campoId),
  ]);
  return plantillaCount + valorCount;
}

async function assertImmutableFieldsIfReferenced(
  tctx: TenantCtx,
  existing: CampoDinamicoDetail,
  input: { clave: string; tipo: string },
): Promise<void> {
  const refCount = await countReferencias(tctx, existing.id);
  if (refCount === 0) return;

  const nextClave = normalizeClave(input.clave);
  const nextTipo = normalizeTipo(input.tipo);

  if (nextClave !== existing.clave) {
    throw new CampoDinamicoFieldError(
      "No se puede cambiar la clave porque el campo ya está en uso.",
      "clave",
      "CAMPO_REFERENCED",
    );
  }

  if (nextTipo !== existing.tipo) {
    throw new CampoDinamicoFieldError(
      "No se puede cambiar el tipo porque el campo ya está en uso.",
      "tipo",
      "CAMPO_REFERENCED",
    );
  }
}

function buildWritePayload(
  input: CreateCampoDinamicoInput | UpdateCampoDinamicoInput,
): CampoDinamicoWritePayload {
  return {
    contexto: input.contexto.trim(),
    clave: normalizeClave(input.clave),
    etiqueta: input.etiqueta.trim(),
    tipo: normalizeTipo(input.tipo),
    placeholder: input.placeholder ?? null,
    ayuda: input.ayuda ?? null,
    valor_default: input.valor_default ?? null,
    ancho_grilla: input.ancho_grilla,
    requerido: input.requerido,
    minimo: input.minimo ?? null,
    maximo: input.maximo ?? null,
    longitud_maxima: input.longitud_maxima ?? null,
    regex: input.regex ?? null,
    buscable: input.buscable,
    filtrable: input.filtrable,
    visible_tabla: input.visible_tabla,
    activo: input.activo,
  };
}

async function syncOpcionesForTipo(
  tctx: TenantCtx,
  campoId: string,
  tipo: string,
  opciones: CreateCampoDinamicoInput["opciones"],
): Promise<void> {
  if (isCampoDinamicoOptionTipo(tipo)) {
    await camposDinamicosRepository.syncOpciones(
      tctx,
      campoId,
      opciones ?? [],
    );
    return;
  }

  await camposDinamicosRepository.syncOpciones(tctx, campoId, []);
}

export const camposDinamicosService = {
  async searchByContexto(
    ctx: Ctx,
    contexto: string,
    query?: string,
  ): Promise<CampoDinamicoListItem[]> {
    const tctx = requireTenantCtx(ctx);
    return camposDinamicosRepository.searchByContexto(tctx, contexto, query);
  },

  async listForAdmin(
    ctx: Ctx,
    contexto: string,
  ): Promise<CampoDinamicoAdminListItem[]> {
    const tctx = requireTenantCtx(ctx);
    return camposDinamicosRepository.listByContexto(tctx, contexto);
  },

  async getById(ctx: Ctx, id: string): Promise<CampoDinamicoDetail> {
    const tctx = requireTenantCtx(ctx);
    const data = await camposDinamicosRepository.getByIdWithOpciones(tctx, id);
    if (!data) {
      throw new NotFoundError("Campo dinámico no encontrado");
    }
    return data;
  },

  async create(
    ctx: Ctx,
    input: CreateCampoDinamicoInput,
  ): Promise<{ id: string }> {
    const tctx = requireTenantCtx(ctx);
    const payload = buildWritePayload(input);

    await assertClaveUnique(tctx, payload.contexto, payload.clave);

    const { id } = await camposDinamicosRepository.insert(tctx, payload);
    await syncOpcionesForTipo(tctx, id, payload.tipo, input.opciones);

    return { id };
  },

  async update(
    ctx: Ctx,
    id: string,
    input: UpdateCampoDinamicoInput,
  ): Promise<void> {
    const tctx = requireTenantCtx(ctx);
    const existing = await camposDinamicosRepository.getByIdWithOpciones(
      tctx,
      id,
    );
    if (!existing) {
      throw new NotFoundError("Campo dinámico no encontrado");
    }

    const payload = buildWritePayload(input);

    await assertImmutableFieldsIfReferenced(tctx, existing, {
      clave: payload.clave,
      tipo: payload.tipo,
    });

    if (payload.clave !== existing.clave) {
      await assertClaveUnique(tctx, payload.contexto, payload.clave, id);
    }

    await camposDinamicosRepository.update(tctx, id, payload);
    await syncOpcionesForTipo(tctx, id, payload.tipo, input.opciones);
  },

  async setActivo(ctx: Ctx, id: string, activo: boolean): Promise<void> {
    const tctx = requireTenantCtx(ctx);
    const existing = await camposDinamicosRepository.getByIdWithOpciones(
      tctx,
      id,
    );
    if (!existing) {
      throw new NotFoundError("Campo dinámico no encontrado");
    }

    await camposDinamicosRepository.update(tctx, id, { activo });
  },
};
