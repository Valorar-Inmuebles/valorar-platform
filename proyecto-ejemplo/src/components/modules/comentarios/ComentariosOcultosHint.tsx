"use client";

type Props = {
  count: number;
  disabled?: boolean;
  onShowAll: () => void;
};

export function ComentariosOcultosHint({
  count,
  disabled = false,
  onShowAll,
}: Props) {
  if (count <= 0) return null;

  const label =
    count === 1
      ? "1 comentario anterior"
      : `${count} comentarios anteriores`;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onShowAll}
      className="group relative mb-1 w-full rounded-lg border border-dashed border-zinc-200 bg-zinc-50/80 px-3 py-2 text-center text-sm text-zinc-500 transition-colors hover:border-zinc-300 hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className="font-medium text-zinc-600 group-hover:text-zinc-800">
        {label}
      </span>
      <span className="mt-0.5 block text-xs text-zinc-400 group-hover:text-zinc-500">
        Ver todos para leer el hilo completo
      </span>
    </button>
  );
}
