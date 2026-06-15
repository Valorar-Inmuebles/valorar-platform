import { getAgendaTipos } from "@/lib/api/agenda.api";
import type { AgendaEventoTipoDto } from "@/lib/types/agenda";

const TTL_MS = 5 * 60 * 1000;

let cache: AgendaEventoTipoDto[] | null = null;
let fetchedAt = 0;
let inflight: Promise<AgendaEventoTipoDto[]> | null = null;

export async function fetchAgendaTiposCached(): Promise<AgendaEventoTipoDto[]> {
  if (cache && Date.now() - fetchedAt < TTL_MS) {
    return cache;
  }

  if (!inflight) {
    inflight = getAgendaTipos()
      .then((data) => {
        cache = data;
        fetchedAt = Date.now();
        return data;
      })
      .finally(() => {
        inflight = null;
      });
  }

  return inflight;
}
