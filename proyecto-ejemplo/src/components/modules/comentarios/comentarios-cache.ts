import { getComentarios } from "@/lib/api/comentarios.api";
import type {
  ComentarioDto,
  ComentarioEntidadTipo,
} from "@/lib/types/comentario";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: ComentarioDto[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<ComentarioDto[]>>();

function cacheKey(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): string {
  return `${entidadTipo}:${entidadId}`;
}

export function invalidateComentariosCache(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): void {
  cache.delete(cacheKey(entidadTipo, entidadId));
}

export function appendComentarioToCache(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
  comentario: ComentarioDto,
): void {
  const key = cacheKey(entidadTipo, entidadId);
  const entry = cache.get(key);
  if (!entry) return;

  entry.data = [...entry.data, comentario];
  entry.fetchedAt = Date.now();
}

export function patchComentarioInCache(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
  comentario: ComentarioDto,
): void {
  const key = cacheKey(entidadTipo, entidadId);
  const entry = cache.get(key);
  if (!entry) return;

  entry.data = entry.data.map((c) => (c.id === comentario.id ? comentario : c));
  entry.fetchedAt = Date.now();
}

export function removeComentarioFromCache(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
  comentarioId: string,
): void {
  const key = cacheKey(entidadTipo, entidadId);
  const entry = cache.get(key);
  if (!entry) return;

  entry.data = entry.data.filter((c) => c.id !== comentarioId);
  entry.fetchedAt = Date.now();
}

export async function fetchComentariosCached(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): Promise<ComentarioDto[]> {
  const key = cacheKey(entidadTipo, entidadId);
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return entry.data;
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = getComentarios(entidadTipo, entidadId)
      .then((data) => {
        cache.set(key, { data, fetchedAt: Date.now() });
        return data;
      })
      .finally(() => {
        inflight.delete(key);
      });
    inflight.set(key, pending);
  }

  return pending;
}
