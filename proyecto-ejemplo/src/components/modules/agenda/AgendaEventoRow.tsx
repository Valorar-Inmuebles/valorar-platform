"use client";

import { Icon } from "@/components/ui/icons";
import {
  getAgendaEventoRowBackgroundColor,
  getAgendaEventoTitleClassName,
} from "@/lib/agenda/agenda-evento-display";
import { formatAgendaFechaColumna, formatAgendaHorario } from "@/lib/agenda/format-agenda-datetime";
import type { AgendaEventoDto, AgendaVariant } from "@/lib/types/agenda";

import { AgendaEventoEstadoBadge } from "./AgendaEventoEstadoBadge";
import { AgendaEventoIrPadreButton } from "./AgendaEventoIrPadreButton";
import { AgendaEventoTipoBadge } from "./AgendaEventoTipoBadge";

export type AgendaEventoRowVariant = AgendaVariant;

type Props = {
  evento: AgendaEventoDto;
  onClick?: () => void;
  showPadre?: boolean;
  variant?: AgendaEventoRowVariant;
};

export function AgendaEventoRow({
  evento,
  onClick,
  showPadre = false,
  variant = "default",
}: Props) {
  const isSidebar = variant === "sidebar";
  const isCompact = variant === "compact";
  const fecha = formatAgendaFechaColumna(evento.inicioAt);
  const horario = formatAgendaHorario({
    inicioAt: evento.inicioAt,
    finAt: evento.finAt,
    todoElDia: evento.todoElDia,
  });

  const rowPadding = isSidebar
    ? "gap-2 px-1.5 py-2"
    : isCompact
      ? "gap-2 px-2 py-2"
      : "gap-3 px-2 py-2.5";

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={`flex w-full min-w-0 items-center overflow-hidden rounded-lg text-left transition-colors hover:bg-zinc-50 ${rowPadding} ${onClick ? "cursor-pointer" : ""}`}
      style={{ backgroundColor: getAgendaEventoRowBackgroundColor(evento) }}
    >
      <div className="flex w-12 shrink-0 flex-col items-center justify-center text-center">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
          {fecha.mes}
        </span>
        <span className="text-xl font-bold leading-tight text-zinc-900">
          {fecha.dia}
        </span>
        <span className="text-[11px] capitalize text-zinc-500">{fecha.diaSemana}</span>
      </div>

      <div
        className={`flex min-w-0 flex-1 items-center overflow-hidden ${
          isSidebar || isCompact ? "gap-2" : "gap-3"
        }`}
      >
        <AgendaEventoTipoBadge tipo={evento.tipo} />

        {!isSidebar && (
          <div className="min-w-0 flex-1">
            <p
              className={`flex min-w-0 items-center gap-1 truncate text-sm font-semibold text-zinc-900 ${getAgendaEventoTitleClassName(evento)}`}
            >
              {evento.estado === "realizado" && (
                <Icon.CheckDone
                  className="size-3.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              )}
              <span className="truncate">{evento.titulo}</span>
            </p>
            {showPadre && evento.padre && (
              <div
                className="mt-1"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                role="presentation"
              >
                <AgendaEventoIrPadreButton padre={evento.padre} />
              </div>
            )}
            {evento.ubicacion && (
              <p className="truncate text-xs text-zinc-500">{evento.ubicacion}</p>
            )}
          </div>
        )}

        <span
          className={`min-w-0 text-xs text-zinc-500 ${
            isSidebar
              ? "flex-1 truncate text-right text-[10px] leading-tight"
              : "hidden shrink-0 sm:block"
          }`}
        >
          {horario}
        </span>

        {isSidebar && evento.estado === "realizado" && (
          <Icon.CheckDone
            className="size-3.5 shrink-0 text-emerald-600"
            aria-hidden
          />
        )}

        <AgendaEventoEstadoBadge estadoVisual={evento.estadoVisual} />
      </div>
    </div>
  );
}