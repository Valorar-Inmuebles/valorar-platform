export type NotificacionDto = {
  id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  leida: boolean;
  createdAt: string;
  link: string | null;
};

export type NotificacionesSummaryDto = {
  unreadCount: number;
  items: NotificacionDto[];
};

/** Respuesta ligera del polling periódico (solo no leídas). */
export type NotificacionesPollDto = {
  unreadCount: number;
  unreadItems: NotificacionDto[];
};
