import type { AgendaEntidadTipo } from "@/lib/types/agenda";

const ENTIDAD_PATH_PREFIX: Record<AgendaEntidadTipo, string> = {
  cliente: "/clientes",
  caso: "/casos",
  expediente: "/expedientes",
  legajo: "/legajos",
  tarea: "/tareas",
  actuacion: "/actuaciones",
};

/** Ruta interna de la app para abrir la entidad padre del evento. */
export function agendaEntidadPath(
  entidadTipo: AgendaEntidadTipo,
  entidadId: string,
): string {
  const prefix = ENTIDAD_PATH_PREFIX[entidadTipo];
  return `${prefix}/${entidadId}`;
}
