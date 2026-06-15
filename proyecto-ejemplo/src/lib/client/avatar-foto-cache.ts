import { getUsuarioFotoUrl } from "@/lib/api/usuarios";

type CacheEntry =
  | { status: "loading"; promise: Promise<string | null> }
  | { status: "ready"; objectUrl: string }
  | { status: "missing" };

const cache = new Map<string, CacheEntry>();

export function getCachedUsuarioFotoUrl(usuarioId: string): string | null {
  const entry = cache.get(usuarioId);
  return entry?.status === "ready" ? entry.objectUrl : null;
}

export function invalidateUsuarioFotoCache(usuarioId: string): void {
  const entry = cache.get(usuarioId);
  if (entry?.status === "ready") {
    URL.revokeObjectURL(entry.objectUrl);
  }
  cache.delete(usuarioId);
}

export function loadUsuarioFoto(usuarioId: string): Promise<string | null> {
  const existing = cache.get(usuarioId);
  if (existing?.status === "ready") {
    return Promise.resolve(existing.objectUrl);
  }
  if (existing?.status === "missing") {
    return Promise.resolve(null);
  }
  if (existing?.status === "loading") {
    return existing.promise;
  }

  const promise = fetch(getUsuarioFotoUrl(usuarioId))
    .then(async (res) => {
      if (!res.ok) {
        cache.set(usuarioId, { status: "missing" });
        return null;
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      cache.set(usuarioId, { status: "ready", objectUrl });
      return objectUrl;
    })
    .catch(() => {
      cache.set(usuarioId, { status: "missing" });
      return null;
    });

  cache.set(usuarioId, { status: "loading", promise });
  return promise;
}
