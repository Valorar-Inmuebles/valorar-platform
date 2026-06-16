import { APP_TIME_ZONE, parseTimestamptz } from "@/lib/datetime/format-display-datetime";
import type { AgendaEventoDto } from "@/lib/types/agenda";

/** Argentina no usa DST desde 2009: offset fijo -03:00 */
const AR_OFFSET = "-03:00";

export type AgendaViewMode = "day" | "week" | "month";

export type AgendaViewRange = {
  desde: string;
  hasta: string;
};

type Ymd = { year: number; month: number; day: number };

const DOW_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function getYmdInTz(date: Date): Ymd {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((p) => p.type === "year")?.value ?? 0),
    month: Number(parts.find((p) => p.type === "month")?.value ?? 0),
    day: Number(parts.find((p) => p.type === "day")?.value ?? 0),
  };
}

function getDowInTz(date: Date): number {
  const wd = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
  return DOW_MAP[wd] ?? 0;
}

export function formatDateKey(date: Date): string {
  const { year, month, day } = getYmdInTz(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00${AR_OFFSET}`);
}

export function parseAnchorDate(fecha?: string | null): Date {
  if (fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    return dateFromKey(fecha);
  }
  return dateFromKey(formatDateKey(new Date()));
}

export function anchorToDateKey(anchor: Date): string {
  return formatDateKey(anchor);
}

function startOfDayIso(dateKey: string): string {
  return new Date(`${dateKey}T00:00:00${AR_OFFSET}`).toISOString();
}

function endOfDayIso(dateKey: string): string {
  return new Date(`${dateKey}T23:59:59${AR_OFFSET}`).toISOString();
}

function addDays(date: Date, days: number): Date {
  const key = formatDateKey(date);
  const base = dateFromKey(key);
  return new Date(base.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number): Date {
  const { year, month, day } = getYmdInTz(date);
  const target = new Date(Date.UTC(year, month - 1 + months, 1, 15));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0))
    .getUTCDate();
  const clampedDay = Math.min(day, lastDay);
  const nextKey = `${target.getUTCFullYear()}-${String(target.getUTCMonth() + 1).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
  return dateFromKey(nextKey);
}

function mondayOfWeek(anchor: Date): Date {
  const dow = getDowInTz(anchor);
  const daysFromMonday = (dow + 6) % 7;
  return addDays(anchor, -daysFromMonday);
}

function monthBounds(anchor: Date): { start: Date; end: Date } {
  const { year, month } = getYmdInTz(anchor);
  const startKey = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endKey = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { start: dateFromKey(startKey), end: dateFromKey(endKey) };
}

export function getViewRange(view: AgendaViewMode, anchor: Date): AgendaViewRange {
  const anchorKey = formatDateKey(anchor);

  if (view === "day") {
    return {
      desde: startOfDayIso(anchorKey),
      hasta: endOfDayIso(anchorKey),
    };
  }

  if (view === "week") {
    const monday = mondayOfWeek(anchor);
    const sunday = addDays(monday, 6);
    return {
      desde: startOfDayIso(formatDateKey(monday)),
      hasta: endOfDayIso(formatDateKey(sunday)),
    };
  }

  const { start, end } = monthBounds(anchor);
  return {
    desde: startOfDayIso(formatDateKey(start)),
    hasta: endOfDayIso(formatDateKey(end)),
  };
}

export function navigateAnchor(
  view: AgendaViewMode,
  anchor: Date,
  direction: -1 | 1,
): Date {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addDays(anchor, direction * 7);
  return addMonths(anchor, direction);
}

export function formatViewTitle(view: AgendaViewMode, anchor: Date): string {
  if (view === "day") {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: APP_TIME_ZONE,
    }).format(anchor);
  }

  if (view === "week") {
    const monday = mondayOfWeek(anchor);
    const sunday = addDays(monday, 6);
    const fmt = new Intl.DateTimeFormat("es-AR", {
      day: "numeric",
      month: "short",
      timeZone: APP_TIME_ZONE,
    });
    const yearFmt = new Intl.DateTimeFormat("es-AR", {
      year: "numeric",
      timeZone: APP_TIME_ZONE,
    });
    return `${fmt.format(monday)} – ${fmt.format(sunday)} ${yearFmt.format(sunday)}`;
  }

  return new Intl.DateTimeFormat("es-AR", {
    month: "long",
    year: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(anchor);
}

export function getWeekDayKeys(anchor: Date): string[] {
  const monday = mondayOfWeek(anchor);
  return Array.from({ length: 7 }, (_, i) => formatDateKey(addDays(monday, i)));
}

export function getMonthGridDayKeys(anchor: Date): string[] {
  const { start, end } = monthBounds(anchor);
  const gridStart = mondayOfWeek(start);
  const gridEnd = addDays(mondayOfWeek(end), 6);
  const keys: string[] = [];
  let cursor = gridStart;
  while (formatDateKey(cursor) <= formatDateKey(gridEnd)) {
    keys.push(formatDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

export function groupEventosByDateKey(
  eventos: AgendaEventoDto[],
): Map<string, AgendaEventoDto[]> {
  const map = new Map<string, AgendaEventoDto[]>();
  for (const evento of eventos) {
    const date = parseTimestamptz(evento.inicioAt);
    if (!date) continue;
    const key = formatDateKey(date);
    const list = map.get(key) ?? [];
    list.push(evento);
    map.set(key, list);
  }
  for (const [, list] of map) {
    list.sort(
      (a, b) =>
        new Date(a.inicioAt).getTime() - new Date(b.inicioAt).getTime(),
    );
  }
  return map;
}

export function getEventMinutesFromMidnight(inicioAt: string): number {
  const date = parseTimestamptz(inicioAt);
  if (!date) return 0;
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: APP_TIME_ZONE,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return hour * 60 + minute;
}

export function getEventDurationMinutes(
  inicioAt: string,
  finAt: string | null,
  todoElDia: boolean,
): number {
  if (todoElDia) return 60;
  const start = parseTimestamptz(inicioAt);
  const end = finAt ? parseTimestamptz(finAt) : null;
  if (!start) return 30;
  if (!end || end <= start) return 30;
  return Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000));
}

export const AGENDA_HOUR_START = 7;
export const AGENDA_HOUR_END = 21;
export const AGENDA_HOUR_SLOTS = Array.from(
  { length: AGENDA_HOUR_END - AGENDA_HOUR_START + 1 },
  (_, i) => AGENDA_HOUR_START + i,
);
