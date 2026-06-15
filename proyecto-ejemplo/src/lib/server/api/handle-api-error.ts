import type { ServerContext } from "@/lib/server/context/types";
import { getOptionalServerContext } from "@/lib/server/context/getOptionalServerContext";
import {
  mapKnownApiError,
  shouldLogApiError,
} from "@/lib/server/api/map-known-api-error";
import {
  resolveIncomingRequestMethod,
  resolveIncomingRequestUrl,
} from "@/lib/server/errors/resolve-request-url";
import { errorLogService } from "@/lib/server/services/error-log.service";

type HandleApiErrorOptions = {
  request?: Request;
  url?: string;
  ctx?: ServerContext | null;
  extra?: Record<string, unknown>;
};

async function resolveUrl(options: HandleApiErrorOptions): Promise<string | null> {
  if (options.url) return options.url;
  if (options.request) return options.request.url;
  return resolveIncomingRequestUrl();
}

export async function handleApiError(
  error: unknown,
  options: HandleApiErrorOptions = {},
): Promise<Response> {
  const mapped = mapKnownApiError(error);
  if (mapped) {
    return Response.json(mapped.body, { status: mapped.status });
  }

  if (shouldLogApiError(error)) {
    const ctx =
      options.ctx !== undefined
        ? options.ctx
        : await getOptionalServerContext();

    const url = await resolveUrl(options);
    const method =
      options.request?.method ??
      (await resolveIncomingRequestMethod()) ??
      undefined;

    await errorLogService.logUnhandled(error, {
      url,
      ctx,
      extra: {
        ...options.extra,
        ...(method ? { method } : {}),
        ...(url ? { api_route: new URL(url, "http://local").pathname } : {}),
      },
    });
  }

  const message = error instanceof Error ? error.message : "Error interno";
  return Response.json({ error: message }, { status: 500 });
}
