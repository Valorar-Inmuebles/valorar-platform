export const SUPER_TENANT_ID = "00000000-0000-0000-0000-000000000000";

export function isSuperUsuario(ctx: {
  tenant_id?: string | null;
  home_tenant_id?: string | null;
}): boolean {
  const tenantId = ctx.home_tenant_id ?? ctx.tenant_id;
  return tenantId === SUPER_TENANT_ID;
}

export function assertSuperUsuario(ctx: {
  tenant_id?: string | null;
}): void {
  if (!isSuperUsuario(ctx)) {
    throw new Error("No autorizado");
  }
}
