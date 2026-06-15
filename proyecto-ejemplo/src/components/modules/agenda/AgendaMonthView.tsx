"use client";

import type { MouseEvent } from "react";

import {
  formatDateKey,
  getMonthGridDayKeys,
  groupEventosByDateKey,
} from "@/lib/agenda/agenda-view-range";
import { APP_TIME_ZONE } from "@/lib/datetime/format-display-datetime";
import { createSlotForDay, type AgendaCreateSlot } from "@/lib/agenda/agenda-create-slot";
import type { AgendaEventoDto } from "@/lib/types/agenda";

import { AgendaEventoChip } from "./AgendaEventoChip";

type Props = {
  anchor: Date;
  eventos: AgendaEventoDto[];
  onEventoClick: (evento: AgendaEventoDto) => void;
  onDayClick?: (dateKey: string) => void;
  onSlotContextMenu?: (event: MouseEvent, slot: AgendaCreateSlot) => void;
  onEventoContextMenu?: (event: MouseEvent, evento: AgendaEventoDto) => void;
};

const WEEKDAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function AgendaMonthView({
  anchor,
  eventos,
  onEventoClick,
  onDayClick,
  onSlotContextMenu,
  onEventoContextMenu,
}: Props) {
  const dayKeys = getMonthGridDayKeys(anchor);
  const grouped = groupEventosByDateKey(eventos);
  const currentMonth = new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    timeZone: APP_TIME_ZONE,
  }).format(anchor);
  const todayKey = formatDateKey(new Date());

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-300 bg-white">
      <div className="grid grid-cols-7 border-b border-zinc-200 bg-zinc-50/80">
        {WEEKDAY_LABELS.map((label) => (
          <div
            key={label}
            className="px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-wide text-zinc-400"
          >
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {dayKeys.map((key) => {
          const date = new Date(`${key}T12:00:00-03:00`);
          const dayMonth = new Intl.DateTimeFormat("en-US", {
            month: "numeric",
            timeZone: APP_TIME_ZONE,
          }).format(date);
          const isCurrentMonth = dayMonth === currentMonth;
          const isToday = key === todayKey;
          const dayNum = new Intl.DateTimeFormat("es-AR", {
            day: "numeric",
            timeZone: APP_TIME_ZONE,
          }).format(date);
          const dayEventos = grouped.get(key) ?? [];
          const visible = dayEventos.slice(0, 3);
          const hidden = dayEventos.length - visible.length;

          return (
            <div
              key={key}
              role={onDayClick ? "button" : undefined}
              tabIndex={onDayClick ? 0 : undefined}
              onClick={() => onDayClick?.(key)}
              onContextMenu={
                onSlotContextMenu
                  ? (e) => {
                      e.preventDefault();
                      onSlotContextMenu(e, createSlotForDay(key));
                    }
                  : undefined
              }
              onKeyDown={
                onDayClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onDayClick(key);
                      }
                    }
                  : undefined
              }
              className={`min-h-[88px] border-b border-r border-zinc-200 p-1 text-left transition-colors hover:bg-zinc-50/80 ${
                onDayClick ? "cursor-pointer" : ""
              } ${!isCurrentMonth ? "bg-zinc-50/40" : ""}`}
            >
              <span
                className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-blue-600 text-white"
                    : isCurrentMonth
                      ? "text-zinc-700"
                      : "text-zinc-300"
                }`}
              >
                {dayNum}
              </span>

              <div className="mt-0.5 flex flex-col gap-0.5">
                {visible.map((evento) => (
                  <AgendaEventoChip
                    key={evento.id}
                    evento={evento}
                    compact
                    showResumenTooltip
                    onContextMenu={onEventoContextMenu}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEventoClick(evento);
                    }}
                  />
                ))}
                {hidden > 0 && (
                  <span className="px-1 text-[10px] font-medium text-zinc-500">
                    +{hidden} más
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
