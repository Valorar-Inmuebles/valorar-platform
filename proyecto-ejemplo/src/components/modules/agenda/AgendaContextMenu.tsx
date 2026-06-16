"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { AgendaCreateSlot } from "@/lib/agenda/agenda-create-slot";
import type { AgendaEventoDto } from "@/lib/types/agenda";

const VIEWPORT_MARGIN = 8;

export type AgendaSlotContextMenuState = {
  kind: "slot";
  x: number;
  y: number;
  slot: AgendaCreateSlot;
};

export type AgendaEventoContextMenuState = {
  kind: "evento";
  x: number;
  y: number;
  evento: AgendaEventoDto;
};

export type AgendaContextMenuState =
  | AgendaSlotContextMenuState
  | AgendaEventoContextMenuState;

type Props = {
  state: AgendaContextMenuState | null;
  onClose: () => void;
  onNewEvent: () => void;
  onEditEvento: (evento: AgendaEventoDto) => void;
  onMarkRealizado: (evento: AgendaEventoDto) => void;
  onMarkCancelado: (evento: AgendaEventoDto) => void;
};

const menuItemClassName =
  "w-full px-3 py-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-50";

export function AgendaContextMenu({
  state,
  onClose,
  onNewEvent,
  onEditEvento,
  onMarkRealizado,
  onMarkCancelado,
}: Props) {
  const menuRef = useRef<HTMLDivElement>(null);
  const open = state != null;
  const x = state?.x ?? 0;
  const y = state?.y ?? 0;
  const [position, setPosition] = useState({ top: y, left: x });

  useLayoutEffect(() => {
    if (!open || !menuRef.current) {
      setPosition({ top: y, left: x });
      return;
    }

    const rect = menuRef.current.getBoundingClientRect();
    let left = x;
    let top = y;

    if (left + rect.width > window.innerWidth - VIEWPORT_MARGIN) {
      left = window.innerWidth - rect.width - VIEWPORT_MARGIN;
    }
    if (top + rect.height > window.innerHeight - VIEWPORT_MARGIN) {
      top = window.innerHeight - rect.height - VIEWPORT_MARGIN;
    }

    left = Math.max(VIEWPORT_MARGIN, left);
    top = Math.max(VIEWPORT_MARGIN, top);
    setPosition({ top, left });
  }, [open, x, y]);

  useEffect(() => {
    if (!open) return;

    function handleDismiss() {
      onClose();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("pointerdown", handleDismiss);
    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handleDismiss);
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined" || !state) return null;

  const canChangeEstado =
    state.kind === "evento" &&
    state.evento.puedeCambiarEstado &&
    state.evento.estado === "programado";

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      style={{ top: position.top, left: position.left }}
      className="fixed z-50 min-w-[11rem] rounded-md border border-zinc-200 bg-white py-1 shadow-md"
      onContextMenu={(e) => e.preventDefault()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {state.kind === "slot" && (
        <button
          type="button"
          role="menuitem"
          className={menuItemClassName}
          onClick={() => {
            onNewEvent();
            onClose();
          }}
        >
          Nuevo evento
        </button>
      )}

      {state.kind === "evento" && (
        <>
          <button
            type="button"
            role="menuitem"
            className={menuItemClassName}
            onClick={() => {
              onEditEvento(state.evento);
              onClose();
            }}
          >
            Editar
          </button>
          {canChangeEstado && (
            <>
              <button
                type="button"
                role="menuitem"
                className={menuItemClassName}
                onClick={() => {
                  onMarkRealizado(state.evento);
                  onClose();
                }}
              >
                Marcar como realizado
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${menuItemClassName} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  onMarkCancelado(state.evento);
                  onClose();
                }}
              >
                Cancelar evento
              </button>
            </>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
