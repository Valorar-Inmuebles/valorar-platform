const TTL_MS = 5 * 60 * 1000;

type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

function cacheKey(url: string): string {
  return url;
}

function getFreshEntry<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

async function fetchCachedJson<T>(url: string): Promise<T> {
  const key = cacheKey(url);
  const fresh = getFreshEntry<T>(key);
  if (fresh) return fresh;

  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const request = fetch(url)
    .then(async (res) => {
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(
          (error as { error?: string }).error || "Error en la solicitud",
        );
      }
      return res.json() as Promise<T>;
    })
    .then((data) => {
      cache.set(key, { data, fetchedAt: Date.now() });
      return data;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export function invalidateTenantsClientCache(): void {
  cache.delete(cacheKey("/api/tenants"));
  cache.delete(cacheKey("/api/usuarios/tenants"));
  cache.delete(cacheKey("/api/usuarios/tenants?includeSuper=true"));
}

export async function fetchTenantsListCached<
  T = Array<{ id: string; nombre: string }>,
>(): Promise<T> {
  return fetchCachedJson<T>("/api/tenants");
}

export async function fetchUsuarioTenantsListCached(
  options?: { includeSuper?: boolean },
): Promise<Array<{ id: string; nombre: string }>> {
  const url = options?.includeSuper
    ? "/api/usuarios/tenants?includeSuper=true"
    : "/api/usuarios/tenants";
  return fetchCachedJson(url);
}
