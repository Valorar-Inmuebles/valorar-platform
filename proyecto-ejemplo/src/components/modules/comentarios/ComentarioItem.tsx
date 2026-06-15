"use client";

import { useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icon } from "@/components/ui/icons";
import type { ComentarioDto } from "@/lib/types/comentario";

import { ComentarioAdjuntoCard } from "./ComentarioAdjuntoCard";
import { ComentarioContenido } from "./ComentarioContenido";
import { ComentarioEditForm } from "./ComentarioEditForm";
import { CommentSpinner } from "./CommentSpinner";
import { formatComentarioDate } from "./format-comentario-date";

type Props = {
  comentario: ComentarioDto;
  isEditing: boolean;
  isDeleting: boolean;
  disabled?: boolean;
  onEdit: (id: string, contenido: string) => Promise<void>;
  onDelete: (id: string) => void;
};

export function ComentarioItem({
  comentario,
  isEditing,
  isDeleting,
  disabled = false,
  onEdit,
  onDelete,
}: Props) {
  const [editing, setEditing] = useState(false);
  const showMenu =
    !disabled &&
    !isEditing &&
    !isDeleting &&
    (comentario.puedeEditar || comentario.puedeEliminar);

  return (
    <article className="relative flex gap-2 py-3">
      <Avatar
        usuarioId={comentario.autor.id}
        name={comentario.autor.nombre}
        hasFoto={comentario.autor.has_foto}
        size="sm"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-medium text-zinc-900">
                {comentario.autor.nombre}
              </span>
              <time
                dateTime={comentario.createdAt}
                className="text-xs text-zinc-400"
              >
                {formatComentarioDate(comentario.createdAt)}
              </time>
              {comentario.editadoAt && (
                <span className="text-xs text-zinc-400">(editado)</span>
              )}
            </div>
          </div>

          {showMenu && !editing && (
            <DropdownMenu align="end">
              <DropdownMenuTrigger
                className="shrink-0 text-zinc-400"
                aria-label="Acciones del comentario"
              >
                <Icon.DotsVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {comentario.puedeEditar && (
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Icon.Edit className="size-3.5" />
                    Editar
                  </DropdownMenuItem>
                )}
                {comentario.puedeEliminar && (
                  <DropdownMenuItem
                    className="text-red-600 hover:text-red-700"
                    onClick={() => onDelete(comentario.id)}
                  >
                    <Icon.Trash className="size-3.5" />
                    Eliminar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {editing ? (
          <ComentarioEditForm
            initialContenido={comentario.contenido}
            saving={isEditing}
            onCancel={() => {
              if (!isEditing) setEditing(false);
            }}
            onSave={async (contenido) => {
              await onEdit(comentario.id, contenido);
              setEditing(false);
            }}
          />
        ) : (
          <>
            <ComentarioContenido
              contenido={comentario.contenido}
              menciones={comentario.menciones}
            />
            {comentario.adjuntos.map((adjunto) => (
              <ComentarioAdjuntoCard key={adjunto.id} adjunto={adjunto} />
            ))}
          </>
        )}
      </div>

      {isDeleting && (
        <div
          className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-white/70"
          aria-live="polite"
          aria-busy="true"
        >
          <CommentSpinner className="size-5" />
          <span className="sr-only">Eliminando comentario</span>
        </div>
      )}

      {isEditing && (
        <div
          className="pointer-events-none absolute right-2 top-2 z-10"
          aria-hidden
        >
          <CommentSpinner className="size-4" />
        </div>
      )}
    </article>
  );
}
