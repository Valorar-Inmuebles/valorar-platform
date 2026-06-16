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

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { cache, next, ...init } = options;
  const url = `${getApiBaseUrl()}${path}`;

  const response = await fetch(url, {
    ...init,
    cache,
    next,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...init.headers,
    },
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

  return `Error de API (${status})`;
}
