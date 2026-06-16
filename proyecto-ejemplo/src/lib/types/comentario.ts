export const COMENTARIO_ENTIDAD_TIPOS = [
  "expediente",
  "caso",
  "cliente",
  "usuario",
  "legajo",
  "evento",
] as const;

export type ComentarioEntidadTipo = (typeof COMENTARIO_ENTIDAD_TIPOS)[number];

export type ComentarioMencionDto = {
  usuarioId: string;
  nombre: string;
};

export type ComentarioAdjuntoDto = {
  id: string;
  documentoId: string;
  nombre: string;
  tipo: string | null;
  tamanoBytes: number | null;
};

export type ComentarioDto = {
  id: string;
  contenido: string;
  createdAt: string;
  updatedAt: string | null;
  editadoAt: string | null;
  autor: {
    id: string;
    nombre: string;
    has_foto: boolean;
  };
  menciones: ComentarioMencionDto[];
  adjuntos: ComentarioAdjuntoDto[];
  puedeEditar: boolean;
  puedeEliminar: boolean;
};

export type ComentarioUsuarioMencionDto = {
  id: string;
  nombre: string;
};

export type ComentariosVariant = "default" | "compact" | "sidebar";
