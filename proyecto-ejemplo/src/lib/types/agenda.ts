export const AGENDA_ENTIDAD_TIPOS = [
  "expediente",
  "caso",
  "cliente",
  "legajo",
  "tarea",
  "actuacion",
] as const;

export type AgendaEntidadTipo = (typeof AGENDA_ENTIDAD_TIPOS)[number];

/** Tipos con listado tenant para filtros de la vista /agenda */
export const AGENDA_ENTIDAD_PADRE_FILTER_TIPOS = [
  "expediente",
  "caso",
  "cliente",
  "legajo",
] as const;

export type AgendaEntidadPadreFilterTipo =
  (typeof AGENDA_ENTIDAD_PADRE_FILTER_TIPOS)[number];

export type AgendaEntidadPadreOption = {
  id: string;
  label: string;
};

export const AGENDA_EVENTO_ESTADOS = [
  "programado",
  "realizado",
  "cancelado",
] as const;

export type AgendaEventoEstado = (typeof AGENDA_EVENTO_ESTADOS)[number];

export const AGENDA_EVENTO_ESTADOS_VISUALES = [
  "pendiente",
  "vencido",
  "realizado",
  "cancelado",
] as const;

export type AgendaEventoEstadoVisual =
  (typeof AGENDA_EVENTO_ESTADOS_VISUALES)[number];

export const AGENDA_HISTORIAL_ACCIONES = [
  "crear",
  "cambio_fecha",
  "cambio_hora",
  "cancelar",
  "realizar",
  "participante_agregado",
  "participante_quitado",
  "edicion",
] as const;

export type AgendaHistorialAccion = (typeof AGENDA_HISTORIAL_ACCIONES)[number];

export type AgendaEventoTipoDto = {
  id: string;
  codigo: string;
  nombre: string;
  colorFondo: string;
  colorTexto: string;
  duracionDefaultMinutos: number;
};

export type AgendaEventoPadreDto = {
  entidadTipo: AgendaEntidadTipo;
  entidadId: string;
  ruta: string;
  etiqueta?: string | null;
};

export const AGENDA_NOTIFICAR_ANTES_UNIDADES = [
  "minutos",
  "horas",
  "dias",
] as const;

export type AgendaNotificarAntesUnidad =
  (typeof AGENDA_NOTIFICAR_ANTES_UNIDADES)[number];

export type AgendaEventoNotificarAntes = {
  cantidad: number;
  unidad: AgendaNotificarAntesUnidad;
};

export type AgendaEventoParticipanteDto = {
  usuarioId: string;
  nombre: string;
  notificadoAt: string | null;
};

export type AgendaUsuarioOptionDto = {
  id: string;
  nombre: string;
};

export type AgendaEventoDto = {
  id: string;
  titulo: string;
  descripcion: string | null;
  ubicacion: string | null;
  observaciones: string | null;
  inicioAt: string;
  finAt: string | null;
  todoElDia: boolean;
  estado: AgendaEventoEstado;
  estadoVisual: AgendaEventoEstadoVisual;
  tipo: AgendaEventoTipoDto;
  padre: AgendaEventoPadreDto | null;
  creadoPor: {
    id: string;
    nombre: string;
  };
  participantes: AgendaEventoParticipanteDto[];
  /** null = sin aviso programado */
  notificarAntes: AgendaEventoNotificarAntes | null;
  createdAt: string;
  updatedAt: string;
  puedeEditar: boolean;
  puedeEliminar: boolean;
  puedeCambiarEstado: boolean;
};

export type AgendaVariant = "default" | "compact" | "sidebar";

export type AgendaHistorialDto = {
  id: string;
  accion: AgendaHistorialAccion;
  detalle: Record<string, unknown> | null;
  usuario: {
    id: string;
    nombre: string;
  };
  createdAt: string;
};
