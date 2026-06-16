"use client";

import type { MouseEvent } from "react";

import {
  AGENDA_HOUR_SLOTS,
  formatDateKey,
  groupEventosByDateKey,
} from "@/lib/agenda/agenda-view-range";
import {
  createSlotAllDay,
  type AgendaCreateSlot,
} from "@/lib/agenda/agenda-create-slot";
import type { AgendaEventoDto } from "@/lib/types/agenda";

import { AgendaEventoChip } from "./AgendaEventoChip";
import { AgendaTimeGridColumn } from "./AgendaTimeGridColumn";

type Props = {
  anchor: Date;
  eventos: AgendaEventoDto[];
  onEventoClick: (evento: AgendaEventoDto) => void;
  onSlotContextMenu?: (event: MouseEvent, slot: AgendaCreateSlot) => void;
  onEventoContextMenu?: (event: MouseEvent, evento: AgendaEventoDto) => void;
};

const SLOT_HEIGHT = 48;

export function AgendaDayView({
  anchor,
  eventos,
  onEventoClick,
  onSlotContextMenu,
  onEventoContextMenu,
}: Props) {
  const dayKey = formatDateKey(anchor);
  const grouped = groupEventosByDateKey(eventos);
  const dayEventos = grouped.get(dayKey) ?? [];
  const allDay = dayEventos.filter((e) => e.todoElDia);
  const timed = dayEventos.filter((e) => !e.todoElDia);

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">
      {allDay.length > 0 && (
        <div
          className="border-b border-zinc-200 px-3 py-2"
          onContextMenu={
            onSlotContextMenu
              ? (e) => {
                  e.preventDefault();
                  onSlotContextMenu(e, createSlotAllDay(dayKey));
                }
              : undefined
          }
        >
          <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
            Todo el día
          </p>
          <div className="flex flex-col gap-1">
            {allDay.map((evento) => (
              <AgendaEventoChip
                key={evento.id}
                evento={evento}
                irPadreAdjacent
                showResumenTooltip
                onContextMenu={onEventoContextMenu}
                onClick={() => onEventoClick(evento)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="flex">
        <div className="w-14 shrink-0 border-r border-zinc-200 bg-zinc-50/50">
          {AGENDA_HOUR_SLOTS.map((hour) => (
            <div
              key={hour}
              className="flex items-start justify-end border-b border-zinc-200 pr-2 pt-1 text-[10px] text-zinc-400"
              style={{ height: SLOT_HEIGHT }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        <AgendaTimeGridColumn
          dayKey={dayKey}
          eventos={timed}
          slotHeight={SLOT_HEIGHT}
          minEventHeight={24}
          onEventoClick={onEventoClick}
          onSlotContextMenu={onSlotContextMenu}
          onEventoContextMenu={onEventoContextMenu}
        />
      </div>
    </div>
  );
}
