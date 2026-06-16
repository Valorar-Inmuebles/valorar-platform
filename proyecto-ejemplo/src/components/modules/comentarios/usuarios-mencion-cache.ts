import { getUsuariosParaMencion } from "@/lib/api/comentarios.api";
import type { ComentarioUsuarioMencionDto } from "@/lib/types/comentario";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: ComentarioUsuarioMencionDto[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();

function cacheKey(q: string): string {
  return q.trim().toLowerCase();
}

export function getCachedUsuariosMencion(
  q: string,
): ComentarioUsuarioMencionDto[] | null {
  const key = cacheKey(q);
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.fetchedAt > TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

export function setCachedUsuariosMencion(
  q: string,
  data: ComentarioUsuarioMencionDto[],
): void {
  cache.set(cacheKey(q), { data, fetchedAt: Date.now() });
}

export async function fetchUsuariosMencionCached(
  q: string,
): Promise<ComentarioUsuarioMencionDto[]> {
  const cached = getCachedUsuariosMencion(q);
  if (cached) return cached;

  const data = await getUsuariosParaMencion(q);
  setCachedUsuariosMencion(q, data);
  return data;
}
