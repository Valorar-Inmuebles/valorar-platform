"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CardHeaderActions,
  CardTitle,
} from "@/components/ui/card";
import { Icon } from "@/components/ui/icons";
import type { ComentariosVariant } from "@/lib/types/comentario";

type Props = {
  variant: ComentariosVariant;
  count: number;
  collapsed: boolean;
  disabled?: boolean;
  hiddenCount?: number;
  showVerTodas: boolean;
  showNuevoComentario?: boolean;
  onToggleCollapse?: () => void;
  onVerTodas?: () => void;
  onNuevoComentario?: () => void;
};

export function ComentariosHeader({
  variant,
  count,
  collapsed,
  disabled = false,
  hiddenCount = 0,
  showVerTodas,
  showNuevoComentario = false,
  onToggleCollapse,
  onVerTodas,
  onNuevoComentario,
}: Props) {
  const title =
    variant === "compact" ? (
      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-900">
        Comentarios ({count})
      </span>
    ) : variant === "sidebar" ? (
      <div className="flex items-center gap-1.5">
        <Icon.Message className="size-4 text-zinc-500" />
        <span className="text-sm font-semibold text-zinc-900">Comentarios</span>
        <Badge variant="neutral">{count}</Badge>
      </div>
    ) : (
      <div className="flex items-center gap-2">
        <CardTitle>Comentarios</CardTitle>
        {count > 0 && <Badge variant="neutral">{count}</Badge>}
      </div>
    );

  const verTodasControl =
    showVerTodas && onVerTodas ? (
      <button
        type="button"
        disabled={disabled}
        onClick={onVerTodas}
        className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:text-zinc-400"
      >
        Ver todos
        {hiddenCount > 0 ? ` (+${hiddenCount})` : ""}
      </button>
    ) : null;

  const nuevoComentarioButton =
    showNuevoComentario && onNuevoComentario ? (
      variant === "sidebar" ? (
        <Button
          type="button"
          size="md"
          disabled={disabled}
          onClick={onNuevoComentario}
        >
          <Icon.Message className="size-3.5" />
          Nuevo comentario
        </Button>
      ) : (
        <Button
          type="button"
          variant="outline-primary"
          size="md"
          disabled={disabled}
          onClick={onNuevoComentario}
          leftIcon={<Icon.PlusSm className="size-3.5" />}
        >
          Nuevo comentario
        </Button>
      )
    ) : null;

  const collapseControl = onToggleCollapse ? (
    <button
      type="button"
      disabled={disabled}
      onClick={onToggleCollapse}
      className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
      aria-label={collapsed ? "Expandir comentarios" : "Colapsar comentarios"}
    >
      <Icon.ChevronDown
        className={`size-4 transition-transform ${collapsed ? "-rotate-90" : ""}`}
      />
    </button>
  ) : null;

  const hasActions =
    verTodasControl != null ||
    nuevoComentarioButton != null ||
    collapseControl != null;

  if (variant === "default") {
    return (
      <>
        {title}
        {hasActions && (
          <CardHeaderActions>
            {verTodasControl}
            {nuevoComentarioButton}
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
        {verTodasControl}
        {nuevoComentarioButton}
        {collapseControl}
      </div>
    </div>
  );
}
