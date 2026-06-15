"use client";

import type { ComentarioDto } from "@/lib/types/comentario";

import { ComentarioItem } from "./ComentarioItem";

type Props = {
  comentarios: ComentarioDto[];
  editingId: string | null;
  deletingId: string | null;
  disabled?: boolean;
  onEdit: (id: string, contenido: string) => Promise<void>;
  onDelete: (id: string) => void;
};

export function ComentarioList({
  comentarios,
  editingId,
  deletingId,
  disabled = false,
  onEdit,
  onDelete,
}: Props) {
  if (comentarios.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-zinc-400">
        Todavía no hay comentarios. Sé el primero en escribir.
      </p>
    );
  }

  return (
    <div className="divide-y divide-zinc-200">
      {comentarios.map((comentario) => (
        <ComentarioItem
          key={comentario.id}
          comentario={comentario}
          isEditing={editingId === comentario.id}
          isDeleting={deletingId === comentario.id}
          disabled={disabled}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
