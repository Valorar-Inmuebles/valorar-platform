import type { getServerContext } from "@/lib/server/context/getServerContext";
import type { DbContext } from "@/BBDD/base/types";

export type ServerContext = Awaited<ReturnType<typeof getServerContext>>;

export function toDbContext(ctx: ServerContext): DbContext {
  return {
    tenant_id: ctx.tenant_id,
    is_superadmin: ctx.is_superadmin,
  };
}

export function requireTenantDbContext(ctx: ServerContext): DbContext & {
  tenant_id: string;
} {
  if (ctx.tenant_id == null) {
    throw new Error("Tenant requerido");
  }
  return {
    tenant_id: ctx.tenant_id,
    is_superadmin: ctx.is_superadmin,
  };
}
