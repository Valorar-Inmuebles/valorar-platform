import { getOptionalServerContext } from "@/lib/server/context/getOptionalServerContext";
import { isHandledDomainError } from "@/lib/server/errors/is-handled-error";
import { errorLogService } from "@/lib/server/services/error-log.service";

type OnRequestErrorArgs = {
  error: Error & { digest?: string };
  request: {
    path: string;
    method: string;
    headers: { [key: string]: string | string[] };
  };
  context: {
    routerKind: string;
    routePath: string;
    routeType: string;
  };
};

export async function logOnRequestError({
  error,
  request,
  context,
}: OnRequestErrorArgs): Promise<void> {
  if (isHandledDomainError(error)) return;

  const ctx = await getOptionalServerContext();

  await errorLogService.logUnhandled(error, {
    url: request.path,
    ctx,
    extra: {
      method: request.method,
      routePath: context.routePath,
      routeType: context.routeType,
      routerKind: context.routerKind,
      digest: error.digest ?? null,
    },
  });
}
