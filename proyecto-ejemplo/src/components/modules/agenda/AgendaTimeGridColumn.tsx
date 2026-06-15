"use client";

import type { MouseEvent } from "react";

import {
  AGENDA_HOUR_SLOTS,
  AGENDA_HOUR_START,
} from "@/lib/agenda/agenda-view-range";
import { layoutAgendaTimeGridEventos } from "@/lib/agenda/agenda-time-grid-layout";
import {
  createSlotFromGridClick,
  type AgendaCreateSlot,
} from "@/lib/agenda/agenda-create-slot";
import type { AgendaEventoDto } from "@/lib/types/agenda";

import { AgendaEventoChip } from "./AgendaEventoChip";

type Props = {
  dayKey: string;
  eventos: AgendaEventoDto[];
  slotHeight: number;
  compact?: boolean;
  minEventHeight?: number;
  onEventoClick: (evento: AgendaEventoDto) => void;
  onSlotContextMenu?: (event: MouseEvent, slot: AgendaCreateSlot) => void;
  onEventoContextMenu?: (event: MouseEvent, evento: AgendaEventoDto) => void;
};

export function AgendaTimeGridColumn({
  dayKey,
  eventos,
  slotHeight,
  compact = false,
  minEventHeight = 20,
  onEventoClick,
  onSlotContextMenu,
  onEventoContextMenu,
}: Props) {
  const layouts = layoutAgendaTimeGridEventos(
    eventos,
    slotHeight,
    AGENDA_HOUR_SLOTS.length,
    minEventHeight,
  );

  return (
    <div
      className="relative min-h-0 flex-1"
      onContextMenu={
        onSlotContextMenu
          ? (e) => {
              e.preventDefault();
              const offsetY =
                e.clientY - e.currentTarget.getBoundingClientRect().top;
              onSlotContextMenu(
                e,
                createSlotFromGridClick(
                  dayKey,
                  offsetY,
                  slotHeight,
                  AGENDA_HOUR_SLOTS.length,
                ),
              );
            }
          : undefined
      }
    >
      {AGENDA_HOUR_SLOTS.map((hour) => (
        <div
          key={hour}
          className="border-b border-zinc-200"
          style={{ height: slotHeight }}
        />
      ))}

      {layouts.map((layout) => {
        const widthPercent = 100 / layout.columnCount;
        const leftPercent = layout.column * widthPercent;
        const inset = layout.columnCount > 1 ? 1 : 2;

        return (
          <div
            key={layout.evento.id}
            className="absolute overflow-hidden"
            style={{
              top: layout.top,
              height: layout.height,
              left: `calc(${leftPercent}% + ${inset}px)`,
              width: `calc(${widthPercent}% - ${inset * 2}px)`,
              zIndex: layout.column + 1,
            }}
          >
            <AgendaEventoChip
              evento={layout.evento}
              timeGrid
              gridHeight={layout.height}
              compact={compact}
              showResumenTooltip
              onContextMenu={onEventoContextMenu}
              onClick={() => onEventoClick(layout.evento)}
            />
          </div>
        );
      })}
    </div>
  );
}
