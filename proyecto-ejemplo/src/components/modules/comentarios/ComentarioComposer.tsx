"use client";

import { useRef, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ActionIconButton } from "@/components/ui/action-icon-button";
import { Icon } from "@/components/ui/icons";
import type { ComentariosVariant } from "@/lib/types/comentario";

import { ComentarioEmojiPicker } from "./ComentarioEmojiPicker";
import { CommentSpinner } from "./CommentSpinner";
import {
  focusTextareaAt,
  insertTextAtCursor,
} from "./insert-text-at-cursor";
import { useMenciones } from "./useMenciones";

type Props = {
  variant: ComentariosVariant;
  autorId?: string;
  autorNombre: string;
  autorHasFoto?: boolean;
  disabled?: boolean;
  onSubmit: (contenido: string) => Promise<void>;
};

const TEXTAREA_BASE =
  "block w-full resize-none rounded-t-lg border-0 bg-transparent px-3 pt-2 text-sm outline-none placeholder:text-zinc-400 disabled:opacity-100";

const TEXTAREA_STATE_DEFAULT =
  "text-zinc-900 focus:ring-0";

const TEXTAREA_STATE_SUBMITTING =
  "cursor-wait text-zinc-400";

const FIELD_SHELL_DEFAULT =
  "border-zinc-200 bg-white focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10";

const FIELD_SHELL_SUBMITTING = "border-zinc-200 bg-zinc-50";

export function ComentarioComposer({
  variant,
  autorId,
  autorNombre,
  autorHasFoto = false,
  disabled,
  onSubmit,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionTriggerRef = useRef<HTMLDivElement>(null);
  const [contenido, setContenido] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const menciones = useMenciones({
    value: contenido,
    onChange: setContenido,
    textareaRef,
    mentionTriggerRef,
  });

  const composerLocked = Boolean(disabled || isSubmitting);
  const isEmbedded = variant === "default";

  const handleSubmit = async () => {
    const trimmed = contenido.trim();
    if (!trimmed || isSubmitting || disabled) return;

    setIsSubmitting(true);
    menciones.setOpen(false);

    try {
      await onSubmit(trimmed);
      setContenido("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEmojiPick = (emoji: string) => {
    const el = textareaRef.current;
    if (!el || composerLocked) return;

    const { next, cursor } = insertTextAtCursor(el, contenido, emoji);
    menciones.handleChange(next);
    requestAnimationFrame(() => focusTextareaAt(el, cursor));
  };

  const placeholder =
    variant === "sidebar" ? "Escribe un comentario..." : "Escribir un comentario...";

  const fieldShellClass = isSubmitting
    ? FIELD_SHELL_SUBMITTING
    : FIELD_SHELL_DEFAULT;

  const textareaRows = variant === "sidebar" ? 2 : isEmbedded ? 3 : 2;

  return (
    <div
      className={`flex items-start gap-3 ${isEmbedded ? "border-t border-zinc-200 pt-4" : "border-t border-zinc-200 pt-3"}`}
    >
      <Avatar
        usuarioId={autorId ?? ""}
        name={autorNombre}
        hasFoto={autorHasFoto}
        size="sm"
      />
      <div className="relative min-w-0 flex-1">
        <div
          className={`overflow-hidden rounded-lg border transition-all duration-150 ${fieldShellClass}`}
        >
          <textarea
            ref={textareaRef}
            value={contenido}
            onChange={(e) => menciones.handleChange(e.target.value)}
            onKeyDown={(e) => {
              menciones.handleKeyDown(e);
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                variant !== "default" &&
                !composerLocked &&
                !menciones.open
              ) {
                e.preventDefault();
                void handleSubmit();
              }
            }}
            rows={textareaRows}
            disabled={disabled}
            readOnly={isSubmitting || disabled}
            aria-busy={isSubmitting}
            placeholder={placeholder}
            className={`${TEXTAREA_BASE} min-h-8 ${isSubmitting ? TEXTAREA_STATE_SUBMITTING : TEXTAREA_STATE_DEFAULT}`}
          />
          <div className="flex items-center justify-end gap-0.5 rounded-b-lg px-1 pb-1 pt-0.5">
            {/* <ActionIconButton
              type="button"
              disabled
              title="Adjuntos — próximamente"
              aria-label="Adjuntar archivo"
            >
              <Icon.Paperclip className="size-3.5" />
            </ActionIconButton> */}
            <ComentarioEmojiPicker
              userId={autorId}
              disabled={composerLocked}
              onPick={handleEmojiPick}
            />
            <div ref={mentionTriggerRef} className="inline-flex">
              <ActionIconButton
                type="button"
                disabled={composerLocked}
                onClick={menciones.openMentionPicker}
                title="Mencionar usuario"
                aria-label="Mencionar usuario"
                aria-expanded={menciones.open}
              >
                <span className="text-sm font-semibold text-zinc-500">@</span>
              </ActionIconButton>
            </div>
          </div>
        </div>

        {menciones.open && (
          <ul
            ref={menciones.popupRef}
            role="listbox"
            aria-busy={menciones.loading}
            className="absolute bottom-full left-0 z-20 mb-1 max-h-40 w-full overflow-auto rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {menciones.loading ? (
              <li className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-500">
                <CommentSpinner className="size-3.5 shrink-0" />
                Cargando usuarios…
              </li>
            ) : menciones.candidatos.length === 0 ? (
              <li className="px-3 py-2 text-sm text-zinc-500">
                No se encontraron usuarios
              </li>
            ) : (
              menciones.candidatos.map((usuario, index) => (
                <li key={usuario.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={index === menciones.activeIndex}
                    className={`w-full px-3 py-2 text-left text-sm ${
                      index === menciones.activeIndex
                        ? "bg-blue-50 text-blue-700"
                        : "text-zinc-700 hover:bg-zinc-50"
                    }`}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      menciones.selectUsuario(usuario);
                    }}
                  >
                    @{usuario.nombre}
                  </button>
                </li>
              ))
            )}
          </ul>
        )}

        {variant === "sidebar" ? (
          <div className="mt-2 flex justify-end">
            <ActionIconButton
              type="button"
              onClick={() => void handleSubmit()}
              disabled={!contenido.trim() || composerLocked}
              aria-busy={isSubmitting}
              aria-label={isSubmitting ? "Enviando comentario" : "Enviar comentario"}
            >
              {isSubmitting ? (
                <CommentSpinner className="size-3.5" />
              ) : (
                <Icon.Send className="size-3.5 text-blue-600" />
              )}
            </ActionIconButton>
          </div>
        ) : (
          <div className="mt-3 flex justify-end">
            <Button
              type="button"
              size="md"
              onClick={() => void handleSubmit()}
              loading={isSubmitting}
              disabled={!contenido.trim() || disabled}
            >
              Comentar
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
