import { getAgendaEntidadesPadre } from "@/lib/api/agenda.api";
import type {
  AgendaEntidadPadreFilterTipo,
  AgendaEntidadPadreOption,
} from "@/lib/types/agenda";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: AgendaEntidadPadreOption[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<AgendaEntidadPadreOption[]>>();

function cacheKey(
  entidadTipo: AgendaEntidadPadreFilterTipo,
  q?: string,
): string {
  return `${entidadTipo}:${(q ?? "").trim().toLowerCase()}`;
}

export async function fetchAgendaEntidadesPadreCached(
  entidadTipo: AgendaEntidadPadreFilterTipo,
  q?: string,
): Promise<AgendaEntidadPadreOption[]> {
  const key = cacheKey(entidadTipo, q);
  const entry = cache.get(key);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return entry.data;
  }

  let pending = inflight.get(key);
  if (!pending) {
    pending = getAgendaEntidadesPadre(entidadTipo, q)
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
