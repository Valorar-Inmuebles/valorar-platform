"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardHeaderActions,
  CardTitle,
} from "@/components/ui/card";
import { ContextIcon } from "@/components/ui/context-icon";
import { Icon } from "@/components/ui/icons";
import type { AgendaVariant } from "@/lib/types/agenda";

type Props = {
  variant: AgendaVariant;
  count: number;
  collapsed?: boolean;
  disabled?: boolean;
  hiddenCount?: number;
  showVerTodos?: boolean;
  onVerTodos?: () => void;
  onNuevoEvento?: () => void;
  onToggleCollapse?: () => void;
};

export function AgendaHeader({
  variant,
  count,
  collapsed = false,
  disabled = false,
  hiddenCount = 0,
  showVerTodos = false,
  onVerTodos,
  onNuevoEvento,
  onToggleCollapse,
}: Props) {
  const title =
    variant === "compact" ? (
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
        Agenda ({count})
      </span>
    ) : variant === "sidebar" ? (
      <div className="flex items-center gap-1.5">
        <Icon.Calendar className="size-4 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-900">Agenda</span>
        <Badge variant="neutral">{count}</Badge>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <ContextIcon tone="violet" size="xs">
          <Icon.Calendar className="size-4" />
        </ContextIcon>
        <CardTitle>Agenda</CardTitle>
        {count > 0 && <Badge variant="neutral">{count}</Badge>}
      </div>
    );

  const verTodosControl =
    showVerTodos && onVerTodos ? (
      <button
        type="button"
        disabled={disabled}
        onClick={onVerTodos}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        Ver todos
        {hiddenCount > 0 ? ` (+${hiddenCount})` : ""}
      </button>
    ) : null;

  const nuevoEventoButton =
    onNuevoEvento != null ? (
      variant === "sidebar" ? (
        <Button
          type="button"
          size="md"
          disabled={disabled}
          onClick={onNuevoEvento}
        >
          <Icon.Calendar className="size-3.5" />
          Nuevo evento
        </Button>
      ) : (
        <button
          type="button"
          disabled={disabled}
          onClick={onNuevoEvento}
          className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-zinc-400"
        >
          + Nuevo Evento
        </button>
      )
    ) : null;

  const collapseControl = onToggleCollapse ? (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggleCollapse}
      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={collapsed ? "Expandir agenda" : "Colapsar agenda"}
    >
      <Icon.ChevronDown
        className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
      />
    </button>
  ) : null;

  const hasActions =
    verTodosControl != null ||
    nuevoEventoButton != null ||
    collapseControl != null;

  if (variant === "default") {
    return (
      <>
        {title}
        {hasActions && (
          <CardHeaderActions>
            {verTodosControl}
            {nuevoEventoButton}
            {collapseControl}
          </CardHeaderActions>
        )}
      </>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-2">
      {title}
      <div className="flex items-center gap-1.5">
        {verTodosControl}
        {nuevoEventoButton}
        {collapseControl}
      </div>
    </div>
  );
}
