import { cookies } from "next/headers";
import { ACTIVE_TENANT_ID_COOKIE, ACCESS_TOKEN_COOKIE } from "@/lib/auth/constants";

const DEFAULT_API_URL = "http://localhost:3002";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? DEFAULT_API_URL;
}

type ApiFetchOptions = RequestInit & {
  cache?: RequestCache;
  next?: NextFetchRequestConfig;
};

async function buildAuthHeaders(
  extra?: HeadersInit,
): Promise<Record<string, string>> {
  const cookieStore = await cookies();
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const accessToken = cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
  if (accessToken) {
    headers.Cookie = `${ACCESS_TOKEN_COOKIE}=${accessToken}`;
  }

  const activeTenantId = cookieStore.get(ACTIVE_TENANT_ID_COOKIE)?.value;
  if (activeTenantId) {
    headers["X-Tenant-Id"] = activeTenantId;
  }

  if (extra instanceof Headers) {
    extra.forEach((value, key) => {
      headers[key] = value;
    });
  } else if (Array.isArray(extra)) {
    for (const [key, value] of extra) {
      headers[key] = value;
    }
  } else if (extra) {
    Object.assign(headers, extra);
  }

  return headers;
}

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { cache, next, headers: initHeaders, ...init } = options;
  const url = `${getApiBaseUrl()}${path}`;
  const headers = await buildAuthHeaders(initHeaders);

  const response = await fetch(url, {
    ...init,
    cache,
    next,
    headers,
  });

  if (!response.ok) {
    let body: unknown = null;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(parseApiErrorMessage(body, response.status), response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function parseApiErrorMessage(body: unknown, status: number): string {
  if (body && typeof body === "object" && "message" in body) {
    const message = (body as { message: string | string[] }).message;
    if (Array.isArray(message)) return message.join(". ");
    if (typeof message === "string" && message.length > 0) return message;
  }

  if (status === 401) {
    return "Tu sesión expiró. Volvé a iniciar sesión.";
  }

  return `Error de API (${status})`;
}
