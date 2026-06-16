"use client";

import { formatDisplayDateTime } from "@/lib/datetime/format-display-datetime";
import type { AgendaHistorialDto } from "@/lib/types/agenda";

const ACCION_LABELS: Record<AgendaHistorialDto["accion"], string> = {
  crear: "Creación",
  cambio_fecha: "Cambio de fecha",
  cambio_hora: "Cambio de hora",
  cancelar: "Cancelación",
  realizar: "Marcado como realizado",
  participante_agregado: "Participante agregado",
  participante_quitado: "Participante quitado",
  edicion: "Edición",
};

type Props = {
  items: AgendaHistorialDto[];
  loading?: boolean;
};

export function AgendaEventoHistorial({ items, loading = false }: Props) {
  if (loading) {
    return <p className="text-sm text-zinc-500">Cargando historial…</p>;
  }

  if (items.length === 0) {
    return <p className="text-sm text-zinc-500">Sin cambios registrados</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-zinc-800">
              {ACCION_LABELS[item.accion]}
            </span>
            <span className="shrink-0 text-xs text-zinc-500">
              {formatDisplayDateTime(item.createdAt)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-500">{item.usuario.nombre}</p>
        </li>
      ))}
    </ul>
  );
}
