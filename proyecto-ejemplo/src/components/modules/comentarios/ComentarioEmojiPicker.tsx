"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { ActionIconButton } from "@/components/ui/action-icon-button";

import { COMENTARIO_EMOJIS } from "./comentario-emojis";
import {
  getFrequentComentarioEmojis,
  recordComentarioEmojiUse,
} from "./comentario-emoji-storage";

type Props = {
  userId?: string;
  disabled?: boolean;
  onPick: (emoji: string) => void;
};

type PanelPos = { top: number; left: number; above: boolean };

function EmojiGrid({
  emojis,
  onSelect,
}: {
  emojis: readonly string[];
  onSelect: (emoji: string) => void;
}) {
  return (
    <div className="grid grid-cols-6 gap-0.5">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          role="option"
          aria-label={`Insertar ${emoji}`}
          className="flex size-7 items-center justify-center rounded text-base text-gray-900 transition-colors hover:bg-gray-100"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(emoji);
          }}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

export function ComentarioEmojiPicker({
  userId,
  disabled = false,
  onPick,
}: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<PanelPos | null>(null);
  const [frequent, setFrequent] = useState<string[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const refreshFrequent = useCallback(() => {
    setFrequent(getFrequentComentarioEmojis(userId));
  }, [userId]);

  useEffect(() => {
    refreshFrequent();
  }, [refreshFrequent]);

  const recalcPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const panelHeight = panelRef.current?.offsetHeight ?? 220;
    const gap = 6;
    const openAbove = rect.top >= panelHeight + gap;

    setPos({
      top: openAbove ? rect.top - gap : rect.bottom + gap,
      left: rect.right,
      above: openAbove,
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    recalcPosition();
    const id = requestAnimationFrame(recalcPosition);
    return () => cancelAnimationFrame(id);
  }, [open, frequent, recalcPosition]);

  useEffect(() => {
    if (!open) return;

    window.addEventListener("resize", recalcPosition);
    window.addEventListener("scroll", recalcPosition, true);
    return () => {
      window.removeEventListener("resize", recalcPosition);
      window.removeEventListener("scroll", recalcPosition, true);
    };
  }, [open, recalcPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const handleSelect = (emoji: string) => {
    recordComentarioEmojiUse(emoji, userId);
    refreshFrequent();
    onPick(emoji);
    setOpen(false);
  };

  const frequentSet = new Set(frequent);
  const restEmojis = COMENTARIO_EMOJIS.filter((emoji) => !frequentSet.has(emoji));

  const panel =
    open && pos ? (
      <div
        ref={panelRef}
        role="listbox"
        aria-label="Emojis"
        style={{
          position: "fixed",
          top: pos.top,
          left: pos.left,
          transform: pos.above
            ? "translate(-100%, -100%)"
            : "translate(-100%, 0)",
        }}
        className="z-[300] w-[11.75rem] max-h-[min(16rem,70vh)] overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg"
      >
        {frequent.length > 0 && (
          <div className="mb-1.5">
            <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Recientes
            </p>
            <EmojiGrid emojis={frequent} onSelect={handleSelect} />
          </div>
        )}
        <div>
          {frequent.length > 0 && (
            <p className="mb-1 px-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">
              Todos
            </p>
          )}
          <EmojiGrid emojis={restEmojis} onSelect={handleSelect} />
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className="relative">
      <div ref={triggerRef} className="inline-flex">
        <ActionIconButton
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          title="Insertar emoji"
          aria-label="Insertar emoji"
          onClick={() => {
            setOpen((value) => {
              const next = !value;
              if (!value) refreshFrequent();
              return next;
            });
          }}
        >
          <span className="text-sm leading-none" aria-hidden>
            😊
          </span>
        </ActionIconButton>
      </div>

      {typeof document !== "undefined" && panel
        ? createPortal(panel, document.body)
        : null}
    </div>
  );
}
