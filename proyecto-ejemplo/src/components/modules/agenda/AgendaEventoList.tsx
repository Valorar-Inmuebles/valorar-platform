"use client";

import { hasTooltipContent, Tooltip } from "@/components/ui/tooltip";
import {
  AGENDA_EVENTO_RESUMEN_TOOLTIP_CONTENT_CLASSNAME,
  AGENDA_EVENTO_RESUMEN_TOOLTIP_DELAY_MS,
  formatAgendaEventoResumenTooltip,
} from "@/lib/agenda/agenda-evento-tooltip";
import type { AgendaEventoDto, AgendaVariant } from "@/lib/types/agenda";

import { AgendaEventoRow } from "./AgendaEventoRow";

type Props = {
  eventos: AgendaEventoDto[];
  onEventoClick?: (evento: AgendaEventoDto) => void;
  emptyMessage?: string;
  showResumenTooltip?: boolean;
  rowVariant?: AgendaVariant;
};

export function AgendaEventoList({
  eventos,
  onEventoClick,
  emptyMessage = "No hay eventos programados",
  showResumenTooltip = false,
  rowVariant = "default",
}: Props) {
  if (eventos.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-500">{emptyMessage}</p>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {eventos.map((evento) => {
        const row = (
          <AgendaEventoRow
            evento={evento}
            variant={rowVariant}
            onClick={onEventoClick ? () => onEventoClick(evento) : undefined}
          />
        );

        if (!showResumenTooltip) {
          return <div key={evento.id}>{row}</div>;
        }

        const resumen = formatAgendaEventoResumenTooltip(evento);
        if (!hasTooltipContent(resumen)) {
          return <div key={evento.id}>{row}</div>;
        }

        return (
          <Tooltip
            key={evento.id}
            content={resumen}
            showDelayMs={AGENDA_EVENTO_RESUMEN_TOOLTIP_DELAY_MS}
            triggerClassName="flex w-full"
            contentClassName={AGENDA_EVENTO_RESUMEN_TOOLTIP_CONTENT_CLASSNAME}
          >
            {row}
          </Tooltip>
        );
      })}
    </div>
  );
}
