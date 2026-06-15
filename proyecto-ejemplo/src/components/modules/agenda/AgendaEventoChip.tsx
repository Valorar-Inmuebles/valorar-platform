"use client";

import type { MouseEvent, ReactNode } from "react";

import { Icon } from "@/components/ui/icons";
import { hasTooltipContent, Tooltip } from "@/components/ui/tooltip";
import {
  getAgendaEventoBackgroundColor,
  getAgendaEventoTitleClassName,
} from "@/lib/agenda/agenda-evento-display";
import {
  AGENDA_EVENTO_ICON_TOOLTIP_Z_INDEX,
  AGENDA_EVENTO_RESUMEN_TOOLTIP_CONTENT_CLASSNAME,
  AGENDA_EVENTO_RESUMEN_TOOLTIP_DELAY_MS,
  AGENDA_EVENTO_RESUMEN_TOOLTIP_Z_INDEX,
  formatAgendaEventoResumenTooltip,
} from "@/lib/agenda/agenda-evento-tooltip";
import { formatAgendaNotificarAntesLabel } from "@/lib/agenda/agenda-notificar-antes";
import { formatAgendaHorario } from "@/lib/agenda/format-agenda-datetime";
import type {
  AgendaEventoDto,
  AgendaEventoNotificarAntes,
} from "@/lib/types/agenda";

import { AgendaEventoIrPadreIconButton } from "./AgendaEventoIrPadreIconButton";

type Props = {
  evento: AgendaEventoDto;
  onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
  onContextMenu?: (event: MouseEvent, evento: AgendaEventoDto) => void;
  compact?: boolean;
  /** Icono «ir al padre» junto al título (vista día). */
  irPadreAdjacent?: boolean;
  /** Bloque proporcional al horario en grilla día/semana. */
  timeGrid?: boolean;
  /** Altura del bloque en px (grilla día/semana); define si entra horario. */
  gridHeight?: number;
  showResumenTooltip?: boolean;
};

function AgendaEventoNotificarClockTooltip({
  notificarAntes,
  iconSize,
  className = "",
}: {
  notificarAntes: AgendaEventoNotificarAntes;
  iconSize: string;
  className?: string;
}) {
  const label = formatAgendaNotificarAntesLabel(notificarAntes);

  return (
    <Tooltip content={label} zIndex={AGENDA_EVENTO_ICON_TOOLTIP_Z_INDEX}>
      <span
        className={`inline-flex shrink-0 ${className}`}
        aria-label={`Aviso programado: ${label}`}
      >
        <Icon.Clock className={`${iconSize} opacity-90`} aria-hidden />
      </span>
    </Tooltip>
  );
}

function AgendaEventoChipStatusIcons({
  evento,
  iconSize,
}: {
  evento: AgendaEventoDto;
  iconSize: string;
}) {
  const showAviso = evento.notificarAntes != null;
  const showRealizado = evento.estado === "realizado";
  if (!showAviso && !showRealizado) return null;

  return (
    <span className="ml-auto flex shrink-0 items-center gap-0.5">
      {showAviso && evento.notificarAntes && (
        <AgendaEventoNotificarClockTooltip
          notificarAntes={evento.notificarAntes}
          iconSize={iconSize}
        />
      )}
      {showRealizado && (
        <Icon.CheckDone
          className={`${iconSize} shrink-0 text-emerald-600`}
          aria-label="Realizado"
        />
      )}
    </span>
  );
}

function getTimeGridTitlePaddingClass(iconCount: number): string {
  if (iconCount >= 3) return "pr-12";
  if (iconCount === 2) return "pr-8";
  if (iconCount === 1) return "pr-5";
  return "";
}

function wrapWithAgendaResumenTooltip(
  content: ReactNode,
  {
    showResumenTooltip,
    evento,
    triggerClassName = "inline-flex min-w-0",
  }: {
    showResumenTooltip: boolean;
    evento: AgendaEventoDto;
    triggerClassName?: string;
  },
): ReactNode {
  if (!showResumenTooltip) return content;

  const resumen = formatAgendaEventoResumenTooltip(evento);
  if (!hasTooltipContent(resumen)) return content;

  return (
    <Tooltip
      content={resumen}
      showDelayMs={AGENDA_EVENTO_RESUMEN_TOOLTIP_DELAY_MS}
      zIndex={AGENDA_EVENTO_RESUMEN_TOOLTIP_Z_INDEX}
      triggerClassName={triggerClassName}
      contentClassName={AGENDA_EVENTO_RESUMEN_TOOLTIP_CONTENT_CLASSNAME}
    >
      {content}
    </Tooltip>
  );
}

export function AgendaEventoChip({
  evento,
  onClick,
  onContextMenu,
  compact = false,
  irPadreAdjacent = false,
  timeGrid = false,
  gridHeight,
  showResumenTooltip = false,
}: Props) {
  const horario = formatAgendaHorario({
    inicioAt: evento.inicioAt,
    finAt: evento.finAt,
    todoElDia: evento.todoElDia,
  });

  const iconSize = compact ? "size-2.5" : "size-3";

  function handleContextMenu(event: MouseEvent<HTMLElement>) {
    if (!onContextMenu) return;
    event.preventDefault();
    event.stopPropagation();
    onContextMenu(event, evento);
  }

  const showAviso = evento.notificarAntes != null;
  const showRealizado = evento.estado === "realizado";
  const showPadre = Boolean(evento.padre);
  const overlayIconCount = [showAviso, showRealizado, showPadre].filter(
    Boolean,
  ).length;
  const showHorarioInGrid =
    Boolean(horario) && (gridHeight == null || gridHeight >= 40);
  const titleClampClass =
    gridHeight != null && gridHeight >= 56 ? "line-clamp-2" : "truncate";
  const titlePrClass = getTimeGridTitlePaddingClass(overlayIconCount);

  if (timeGrid) {
    const titleButton = (
      <button
        type="button"
        onClick={onClick}
        title={
          showResumenTooltip
            ? undefined
            : `${evento.titulo}${horario ? ` · ${horario}` : ""}`
        }
        className={`h-full min-h-0 w-full px-1.5 py-0.5 text-left transition-opacity hover:opacity-90 ${titlePrClass}`}
      >
        <span
          className={`block min-w-0 text-xs font-semibold leading-tight ${titleClampClass} ${getAgendaEventoTitleClassName(evento)}`}
        >
          {evento.titulo}
        </span>

        {showHorarioInGrid && (
          <span
            className={`mt-0.5 block truncate opacity-80 ${
              compact ? "text-[9px]" : "text-[10px]"
            }`}
          >
            {horario}
          </span>
        )}
      </button>
    );

    return (
      <div
        className="relative h-full min-h-0 w-full overflow-hidden rounded border border-black/5"
        style={{
          backgroundColor: getAgendaEventoBackgroundColor(evento),
          color: evento.tipo.colorTexto,
        }}
        onContextMenu={onContextMenu ? handleContextMenu : undefined}
      >
        {overlayIconCount > 0 && (
          <div className="absolute right-0 top-0 z-[1] flex items-center gap-0">
            {showAviso && evento.notificarAntes && (
              <AgendaEventoNotificarClockTooltip
                notificarAntes={evento.notificarAntes}
                iconSize={iconSize}
                className="px-0.5 pt-0.5"
              />
            )}
            {showRealizado && (
              <span className="pointer-events-none px-0.5 pt-0.5">
                <Icon.CheckDone
                  className={`${iconSize} shrink-0 text-emerald-600`}
                  aria-hidden
                />
              </span>
            )}
            {showPadre && evento.padre && (
              <AgendaEventoIrPadreIconButton
                padre={evento.padre}
                iconClassName={iconSize}
                className="!size-4 shrink-0"
              />
            )}
          </div>
        )}

        {wrapWithAgendaResumenTooltip(titleButton, {
          showResumenTooltip,
          evento,
          triggerClassName: "block h-full w-full min-h-0",
        })}
      </div>
    );
  }

  const titleButton = (
    <button
      type="button"
      onClick={onClick}
      title={
        showResumenTooltip
          ? undefined
          : `${evento.titulo}${horario ? ` · ${horario}` : ""}`
      }
      className={`min-w-0 truncate text-left text-xs font-medium transition-opacity hover:opacity-90 ${
        irPadreAdjacent ? "shrink" : "w-full"
      }`}
    >
      <span className="flex min-w-0 items-center gap-1 truncate">
        {!evento.todoElDia && horario && !compact && (
          <span className="shrink-0 opacity-80">{horario}</span>
        )}
        <span className={`truncate ${getAgendaEventoTitleClassName(evento)}`}>
          {evento.titulo}
        </span>
      </span>
    </button>
  );

  return (
    <div
      className={`flex w-full min-w-0 items-center gap-0.5 rounded px-1.5 ${
        compact ? "py-0.5" : "py-1"
      }`}
      style={{
        backgroundColor: getAgendaEventoBackgroundColor(evento),
        color: evento.tipo.colorTexto,
      }}
      onContextMenu={onContextMenu ? handleContextMenu : undefined}
    >
      <div
        className={`flex min-w-0 flex-1 items-center overflow-hidden ${
          irPadreAdjacent ? "gap-5" : "gap-0.5"
        }`}
      >
        {wrapWithAgendaResumenTooltip(titleButton, {
          showResumenTooltip,
          evento,
          triggerClassName: `min-w-0 ${irPadreAdjacent ? "shrink" : "flex-1"}`,
        })}

        {irPadreAdjacent && evento.padre && (
          <AgendaEventoIrPadreIconButton
            padre={evento.padre}
            iconClassName={iconSize}
            className="!size-5 shrink-0"
          />
        )}
      </div>

      {!irPadreAdjacent && evento.padre && (
        <AgendaEventoIrPadreIconButton
          padre={evento.padre}
          iconClassName={iconSize}
          className="!size-5 shrink-0"
        />
      )}

      <AgendaEventoChipStatusIcons evento={evento} iconSize={iconSize} />
    </div>
  );
}
