import { getAgendaEventoHistorial } from "@/lib/api/agenda.api";
import type { AgendaHistorialDto } from "@/lib/types/agenda";

const TTL_MS = 5 * 60 * 1000;

type CacheEntry = {
  data: AgendaHistorialDto[];
  fetchedAt: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<AgendaHistorialDto[]>>();

export function invalidateAgendaEventoHistorialCache(eventoId: string): void {
  cache.delete(eventoId);
}

export async function fetchAgendaEventoHistorialCached(
  eventoId: string,
): Promise<AgendaHistorialDto[]> {
  const entry = cache.get(eventoId);
  if (entry && Date.now() - entry.fetchedAt < TTL_MS) {
    return entry.data;
  }

  let pending = inflight.get(eventoId);
  if (!pending) {
    pending = getAgendaEventoHistorial(eventoId)
      .then((data) => {
        cache.set(eventoId, { data, fetchedAt: Date.now() });
        return data;
      })
      .finally(() => {
        inflight.delete(eventoId);
      });
    inflight.set(eventoId, pending);
  }

  return pending;
}
