import type { DbContext } from "./types";
import { requireTenantId } from "./BaseRepository";

export function ilikePattern(term: string): string {
  const safe = term
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
  return `%${safe}%`;
}

export function tenantParam(ctx: DbContext): string {
  return requireTenantId(ctx);
}

export function nowIso(): string {
  return new Date().toISOString();
}
