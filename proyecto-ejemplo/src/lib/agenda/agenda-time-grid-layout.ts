import {
  AGENDA_HOUR_END,
  AGENDA_HOUR_START,
  getEventDurationMinutes,
  getEventMinutesFromMidnight,
} from "@/lib/agenda/agenda-view-range";
import type { AgendaEventoDto } from "@/lib/types/agenda";

const TOTAL_MINUTES = (AGENDA_HOUR_END - AGENDA_HOUR_START + 1) * 60;
const GRID_START_MIN = AGENDA_HOUR_START * 60;
const GRID_END_MIN = AGENDA_HOUR_END * 60 + 60;

export type AgendaTimeGridEventLayout = {
  evento: AgendaEventoDto;
  top: number;
  height: number;
  column: number;
  columnCount: number;
};

type TimedSlot = {
  evento: AgendaEventoDto;
  startMin: number;
  endMin: number;
  top: number;
  height: number;
  column: number;
};

function overlaps(a: TimedSlot, b: TimedSlot): boolean {
  return a.startMin < b.endMin && b.startMin < a.endMin;
}

export function layoutAgendaTimeGridEventos(
  eventos: AgendaEventoDto[],
  slotHeight: number,
  hourSlotCount: number,
  minHeight = 20,
): AgendaTimeGridEventLayout[] {
  const gridHeight = hourSlotCount * slotHeight;

  const slots: TimedSlot[] = [];

  for (const evento of eventos) {
    if (evento.todoElDia) continue;

    const startMin = getEventMinutesFromMidnight(evento.inicioAt);
    const duration = getEventDurationMinutes(
      evento.inicioAt,
      evento.finAt,
      evento.todoElDia,
    );
    const endMin = startMin + duration;

    if (startMin >= GRID_END_MIN || endMin <= GRID_START_MIN) continue;

    const visibleStart = Math.max(startMin, GRID_START_MIN);
    const visibleEnd = Math.min(endMin, GRID_END_MIN);
    const visibleDuration = Math.max(15, visibleEnd - visibleStart);

    const top =
      ((visibleStart - GRID_START_MIN) / TOTAL_MINUTES) * gridHeight;
    const height = Math.max(
      minHeight,
      (visibleDuration / TOTAL_MINUTES) * gridHeight,
    );

    slots.push({
      evento,
      startMin,
      endMin,
      top: Math.max(0, top),
      height,
      column: 0,
    });
  }

  slots.sort(
    (a, b) =>
      a.startMin - b.startMin ||
      b.endMin - b.startMin - (a.endMin - a.startMin),
  );

  const columnEnds: number[] = [];

  for (const slot of slots) {
    let column = columnEnds.findIndex((endMin) => endMin <= slot.startMin);
    if (column === -1) {
      column = columnEnds.length;
      columnEnds.push(0);
    }
    slot.column = column;
    columnEnds[column] = slot.endMin;
  }

  return slots.map((slot) => {
    const overlapping = slots.filter((other) => overlaps(slot, other));
    const columnCount =
      Math.max(...overlapping.map((other) => other.column), 0) + 1;

    return {
      evento: slot.evento,
      top: slot.top,
      height: slot.height,
      column: slot.column,
      columnCount,
    };
  });
}
