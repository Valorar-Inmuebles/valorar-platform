import type { QueryResultRow } from "pg";

export type { QueryResultRow };

export type DbContext = {
  tenant_id?: string | null;
  is_superadmin?: boolean;
};

export function toDbContext(ctx: {
  tenant_id: string | null;
  is_superadmin?: boolean;
}): DbContext {
  return {
    tenant_id: ctx.tenant_id,
    is_superadmin: ctx.is_superadmin,
  };
}

export type TenantFilter = {
  clause: string;
  params: string[];
  nextParamIndex: number;
};
