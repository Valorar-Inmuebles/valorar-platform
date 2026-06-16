import { escapeHtml } from "@/lib/notificaciones/escape-html";
import type { ComentarioEntidadTipo } from "@/lib/types/comentario";

const ENTIDAD_PATH_PREFIX: Record<ComentarioEntidadTipo, string> = {
  cliente: "/clientes",
  caso: "/casos",
  expediente: "/expedientes",
  usuario: "/usuarios",
  legajo: "/legajos",
  evento: "/agenda",
};

/** Ruta interna de la app para abrir la entidad del comentario (p. ej. `/clientes/uuid`). */
export function comentarioEntidadPath(
  entidadTipo: ComentarioEntidadTipo,
  entidadId: string,
): string {
  const prefix = ENTIDAD_PATH_PREFIX[entidadTipo];
  return `${prefix}/${entidadId}`;
}

const ENTIDAD_ARTICULO: Record<ComentarioEntidadTipo, string> = {
  cliente: "un cliente",
  caso: "un caso",
  expediente: "un expediente",
  usuario: "un usuario",
  legajo: "un legajo",
  evento: "un evento",
};

/** HTML del mensaje de notificación por mención. */
export function buildComentarioMencionMensaje(
  autorNombre: string,
  entidadTipo: ComentarioEntidadTipo,
): string {
  const articulo = ENTIDAD_ARTICULO[entidadTipo];
  return `<strong>${escapeHtml(autorNombre)}</strong> te mencionó en un comentario sobre ${articulo}.`;
}
