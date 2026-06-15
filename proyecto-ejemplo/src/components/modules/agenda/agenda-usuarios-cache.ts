import { getAgendaUsuarios } from "@/lib/api/agenda.api";
import type { AgendaUsuarioOptionDto } from "@/lib/types/agenda";

const TTL_MS = 5 * 60 * 1000;

let cache: AgendaUsuarioOptionDto[] | null = null;
let fetchedAt = 0;
let inflight: Promise<AgendaUsuarioOptionDto[]> | null = null;

export async function fetchAgendaUsuariosCached(): Promise<AgendaUsuarioOptionDto[]> {
  if (cache && Date.now() - fetchedAt < TTL_MS) {
    return cache;
  }

  if (!inflight) {
    inflight = getAgendaUsuarios()
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
