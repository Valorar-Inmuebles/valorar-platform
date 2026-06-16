import type { QueryResultRow } from "pg";

import { pgPool } from "./executor";
import type { DbContext, TenantFilter } from "./types";

export function requireTenantId(ctx: DbContext): string {
  if (ctx.tenant_id != null) return ctx.tenant_id;
  if (ctx.is_superadmin) {
    throw new Error("Tenant requerido para esta operación");
  }
  throw new Error("Tenant requerido");
}

export function buildTenantFilter(
  ctx: DbContext,
  alias?: string,
  startParamIndex = 1,
): TenantFilter {
  const tenantId = requireTenantId(ctx);
  const col = alias ? `${alias}.tenant_id` : "tenant_id";
  return {
    clause: `${col} = $${startParamIndex}`,
    params: [tenantId],
    nextParamIndex: startParamIndex + 1,
  };
}

export function softDeleteClause(alias?: string): string {
  const col = alias ? `${alias}.deleted_at` : "deleted_at";
  return `${col} IS NULL`;
}

export abstract class BaseRepository<T extends QueryResultRow> {
  protected abstract tableName: string;
  protected tenantScoped = true;

  protected get db() {
    return pgPool;
  }

  protected async query<R extends QueryResultRow = T>(
    sql: string,
    params?: unknown[],
  ): Promise<R[]> {
    const result = await this.db.query<R>(sql, params);
    return result.rows;
  }

  protected tenantWhere(ctx: DbContext, alias?: string, startParamIndex = 1): TenantFilter {
    if (!this.tenantScoped) {
      return { clause: "TRUE", params: [], nextParamIndex: startParamIndex };
    }
    return buildTenantFilter(ctx, alias, startParamIndex);
  }
}
