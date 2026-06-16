import { requireAuth } from "@/lib/auth/require-auth";

export function isSuperadmin(ctx: any): boolean {
  return ctx.roles?.includes("superadmin");
}