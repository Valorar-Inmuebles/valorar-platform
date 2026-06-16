import { headers } from "next/headers";

function buildAbsoluteUrl(path: string, host: string, proto: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${proto}://${host}${normalizedPath}`;
}

/** Resuelve la URL del request entrante cuando no hay objeto Request disponible. */
export async function resolveIncomingRequestUrl(): Promise<string | null> {
  try {
    const h = await headers();

    const directUrl =
      h.get("next-url") ??
      h.get("x-url") ??
      h.get("x-middleware-request-url") ??
      h.get("referer");

    if (directUrl) return directUrl;

    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";

    if (!host) return null;

    const path =
      h.get("x-invoke-path") ??
      h.get("x-matched-path") ??
      h.get("x-nextjs-matched-path") ??
      h.get("next-router-pathname");

    if (path) return buildAbsoluteUrl(path, host, proto);

    return null;
  } catch {
    return null;
  }
}

export async function resolveIncomingRequestMethod(): Promise<string | null> {
  try {
    return (await headers()).get("x-http-method") ?? null;
  } catch {
    return null;
  }
}
