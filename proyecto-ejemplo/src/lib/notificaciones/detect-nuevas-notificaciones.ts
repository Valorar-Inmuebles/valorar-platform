import type { NotificacionesPollDto } from "@/lib/types/notificacion";

type NotificacionesSnapshot = Pick<
  NotificacionesPollDto,
  "unreadCount"
> & {
  items: NotificacionesPollDto["unreadItems"];
};

/** Detecta si llegaron notificaciones nuevas respecto al poll anterior. */
export function detectNuevasNotificaciones(
  previous: NotificacionesSnapshot | null,
  next: NotificacionesSnapshot,
): boolean {
  if (!previous) return false;

  if (next.unreadCount > previous.unreadCount) return true;

  const previousUnreadIds = new Set(
    previous.items.filter((item) => !item.leida).map((item) => item.id),
  );

  return next.items.some(
    (item) => !item.leida && !previousUnreadIds.has(item.id),
  );
}
