import { AGENDA_HOUR_END, AGENDA_HOUR_START } from "@/lib/agenda/agenda-view-range";

const DEFAULT_DURATION_MINUTES = 60;
const DEFAULT_DAY_START_TIME = "09:00";

export type AgendaCreateSlot = {
  fecha: string;
  hora_inicio?: string;
  hora_fin?: string;
  todo_el_dia?: boolean;
};

function formatMinutesAsTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function clampMinutes(minutes: number): number {
  const min = AGENDA_HOUR_START * 60;
  const max = AGENDA_HOUR_END * 60;
  return Math.max(min, Math.min(max, minutes));
}

/** Convierte offset Y dentro de la grilla horaria a hora inicio/fin (en punto :00). */
export function gridYOffsetToCreateTimes(
  offsetY: number,
  slotHeight: number,
  slotCount: number,
  durationMinutes = DEFAULT_DURATION_MINUTES,
): Pick<AgendaCreateSlot, "hora_inicio" | "hora_fin"> {
  const hourIndex = Math.floor(Math.max(0, offsetY) / slotHeight);
  const cappedIndex = Math.min(hourIndex, slotCount - 1);
  const hour = AGENDA_HOUR_START + cappedIndex;
  const startMinutes = hour * 60;
  const endMinutes = clampMinutes(startMinutes + durationMinutes);

  return {
    hora_inicio: formatMinutesAsTime(startMinutes),
    hora_fin: formatMinutesAsTime(endMinutes),
  };
}

export function createSlotForDay(dateKey: string): AgendaCreateSlot {
  return {
    fecha: dateKey,
    hora_inicio: DEFAULT_DAY_START_TIME,
    hora_fin: formatMinutesAsTime(9 * 60 + DEFAULT_DURATION_MINUTES),
    todo_el_dia: false,
  };
}

export function createSlotAllDay(dateKey: string): AgendaCreateSlot {
  return {
    fecha: dateKey,
    todo_el_dia: true,
  };
}

export function createSlotFromGridClick(
  dateKey: string,
  offsetY: number,
  slotHeight: number,
  slotCount: number,
): AgendaCreateSlot {
  return {
    fecha: dateKey,
    ...gridYOffsetToCreateTimes(offsetY, slotHeight, slotCount),
    todo_el_dia: false,
  };
}
