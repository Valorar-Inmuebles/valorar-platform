import type { ServerContext } from "@/lib/server/context/types";
import { errorLogRepository } from "@/BBDD/repositories/error-log.repository";
import { buildErrorDiagnostics } from "@/lib/server/errors/capture-error-context";

export type ErrorLogContext = {
  url?: string | null;
  ctx?: ServerContext | null;
  extra?: Record<string, unknown>;
};

function formatError(error: unknown): string {
  if (error instanceof Error) {
    const stack = error.stack?.trim();
    return stack
      ? `${error.name}: ${error.message}\n${stack}`
      : `${error.name}: ${error.message}`;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildInfoAdicional(
  error: unknown,
  options: ErrorLogContext,
): string {
  const ctx = options.ctx;
  const diagnostics = buildErrorDiagnostics(error);

  const payload: Record<string, unknown> = {
    ...(options.extra ?? {}),
    thrown_at: diagnostics.thrown_at,
    call_chain: diagnostics.call_chain,
  };

  if (diagnostics.cause !== null && diagnostics.cause !== undefined) {
    payload.cause = diagnostics.cause;
  }

  if (ctx) {
    payload.user = {
      id: ctx.user.id,
      email: ctx.user.email,
      displayName: ctx.displayName,
    };
    payload.tenant_id = ctx.tenant_id;
    payload.tenant = ctx.tenant;
    payload.roles = ctx.roles;
    payload.is_superadmin = ctx.is_superadmin;
  } else {
    payload.user = null;
  }

  return JSON.stringify(payload);
}

export const errorLogService = {
  async logUnhandled(
    error: unknown,
    options: ErrorLogContext = {},
  ): Promise<void> {
    try {
      await errorLogRepository.create({
        url: options.url ?? null,
        error: formatError(error),
        info_adicional: buildInfoAdicional(error, options),
      });
    } catch (logError) {
      console.error("[error-log] No se pudo persistir el error:", logError);
    }
  },
};
