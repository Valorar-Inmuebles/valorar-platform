"use client";

import type { MouseEvent } from "react";

import {
  AGENDA_HOUR_SLOTS,
  formatDateKey,
  getWeekDayKeys,
  groupEventosByDateKey,
} from "@/lib/agenda/agenda-view-range";
import { APP_TIME_ZONE } from "@/lib/datetime/format-display-datetime";
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

const SLOT_HEIGHT = 40;

function formatDayHeader(key: string): { label: string; isToday: boolean } {
  const date = new Date(`${key}T12:00:00-03:00`);
  const todayKey = formatDateKey(new Date());
  const label = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(date);
  return { label, isToday: key === todayKey };
}

export function AgendaWeekView({
  anchor,
  eventos,
  onEventoClick,
  onSlotContextMenu,
  onEventoContextMenu,
}: Props) {
  const dayKeys = getWeekDayKeys(anchor);
  const grouped = groupEventosByDateKey(eventos);
  const hasAllDayEvents = dayKeys.some((key) =>
    (grouped.get(key) ?? []).some((evento) => evento.todoElDia),
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-300 bg-white">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-zinc-200">
          <div />
          {dayKeys.map((key) => {
            const { label, isToday } = formatDayHeader(key);
            return (
              <div
                key={key}
                className={`border-l border-zinc-200 px-1 py-2 text-center text-xs font-medium capitalize ${
                  isToday ? "bg-blue-50 text-blue-700" : "text-zinc-600"
                }`}
              >
                {label}
              </div>
            );
          })}
        </div>

        {hasAllDayEvents && (
          <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-y-2 border-zinc-300 bg-zinc-100/90 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.6)]">
            <div className="flex items-center justify-end border-r border-zinc-300 bg-zinc-200/60 px-1 py-2">
              <span className="text-center text-[9px] font-semibold uppercase leading-tight tracking-wide text-zinc-600">
                Todo el día
              </span>
            </div>
            {dayKeys.map((key) => {
              const allDay = (grouped.get(key) ?? []).filter((e) => e.todoElDia);
              const { isToday } = formatDayHeader(key);

              return (
                <div
                  key={key}
                  className={`flex min-h-8 flex-col gap-0.5 border-l border-zinc-300 px-0.5 py-1.5 ${
                    isToday
                      ? "bg-blue-100/60 ring-1 ring-inset ring-blue-200/80"
                      : "bg-zinc-50/80"
                  }`}
                  onContextMenu={
                    onSlotContextMenu
                      ? (e) => {
                          e.preventDefault();
                          onSlotContextMenu(e, createSlotAllDay(key));
                        }
                      : undefined
                  }
                >
                  {allDay.map((evento) => (
                    <AgendaEventoChip
                      key={evento.id}
                      evento={evento}
                      compact
                      showResumenTooltip
                      onContextMenu={onEventoContextMenu}
                      onClick={() => onEventoClick(evento)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
          <div className="border-r border-zinc-200 bg-zinc-50/50">
            {AGENDA_HOUR_SLOTS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end border-b border-zinc-200 pr-1 pt-0.5 text-[9px] text-zinc-400"
                style={{ height: SLOT_HEIGHT }}
              >
                {String(hour).padStart(2, "0")} hs.
              </div>
            ))}
          </div>

          {dayKeys.map((key) => {
            const dayEventos = (grouped.get(key) ?? []).filter((e) => !e.todoElDia);
            return (
              <div key={key} className="relative border-l border-zinc-200">
                <AgendaTimeGridColumn
                  dayKey={key}
                  eventos={dayEventos}
                  slotHeight={SLOT_HEIGHT}
                  compact
                  minEventHeight={18}
                  onEventoClick={onEventoClick}
                  onSlotContextMenu={onSlotContextMenu}
                  onEventoContextMenu={onEventoContextMenu}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

