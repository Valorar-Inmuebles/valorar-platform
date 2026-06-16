import type { ServerContext } from "@/lib/server/context/types";
import { casoRepository } from "@/BBDD/repositories/caso.repository";
import { expedienteRepository } from "@/BBDD/repositories/expediente.repository";

type Ctx = ServerContext;

type CasoExpedienteRepoCtx = { tenant_id: string; is_superadmin?: boolean };

function requireTenantCtx(ctx: Ctx): CasoExpedienteRepoCtx {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return { tenant_id: ctx.tenant_id, is_superadmin: ctx.is_superadmin };
}

async function assertCasoBelongsToTenant(tctx: CasoExpedienteRepoCtx, casoId: string) {
  await casoRepository.getById(tctx, casoId);
}

export const casoExpedienteService = {
  async getAll(ctx: Ctx, casoId: string) {
    const tctx = requireTenantCtx(ctx);
    await assertCasoBelongsToTenant(tctx, casoId);
    return expedienteRepository.getAllByCaso(tctx, casoId);
  },

  async create(
    ctx: Ctx,
    casoId: string,
    payload: {
      nombre: string;
      tipo?: string | null;
      organismo_id?: string | null;
      parte_representada_id?: string | null;
    },
  ) {
    const tctx = requireTenantCtx(ctx);
    await assertCasoBelongsToTenant(tctx, casoId);
    return expedienteRepository.create(tctx, casoId, {
      nombre: payload.nombre,
      tipo: payload.tipo,
      organismo_id: payload.organismo_id,
      parte_representada_id: payload.parte_representada_id,
    });
  },

  async update(
    ctx: Ctx,
    casoId: string,
    expedienteId: string,
    payload: {
      nombre?: string | null;
      tipo?: string | null;
      organismo_id?: string | null;
      parte_representada_id?: string | null;
    },
  ) {
    const tctx = requireTenantCtx(ctx);
    await assertCasoBelongsToTenant(tctx, casoId);
    await expedienteRepository.update(tctx, casoId, expedienteId, payload);
  },

  async delete(ctx: Ctx, casoId: string, expedienteId: string) {
    const tctx = requireTenantCtx(ctx);
    await assertCasoBelongsToTenant(tctx, casoId);
    return expedienteRepository.delete(tctx, casoId, expedienteId);
  },
};
