import type { AgendaViewMode } from "@/lib/agenda/agenda-view-range";

const STORAGE_PREFIX = "jurilexia:agenda:vista";
const VALID_VIEWS = new Set<AgendaViewMode>(["day", "week", "month"]);

function storageKey(userId: string | undefined): string {
  return userId ? `${STORAGE_PREFIX}:${userId}` : STORAGE_PREFIX;
}

export function getAgendaViewPreference(
  userId?: string,
): AgendaViewMode | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw || !VALID_VIEWS.has(raw as AgendaViewMode)) return null;
    return raw as AgendaViewMode;
  } catch {
    return null;
  }
}

export function saveAgendaViewPreference(
  view: AgendaViewMode,
  userId?: string,
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey(userId), view);
  } catch {
    // ignore quota / private mode
  }
}
