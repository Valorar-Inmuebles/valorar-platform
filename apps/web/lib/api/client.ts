const DEFAULT_API_URL = "http://localhost:3002";
const DEFAULT_REVALIDATE_SECONDS = 300;

export function getApiBaseUrl(): string {
  return process.env.API_URL ?? DEFAULT_API_URL;
}

type ApiFetchOptions = RequestInit & {
  revalidate?: number;
};

export async function apiFetch<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { revalidate = DEFAULT_REVALIDATE_SECONDS, ...init } = options;
  const url = `${getApiBaseUrl()}${path}`;

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...init.headers,
    },
    next: { revalidate },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}
