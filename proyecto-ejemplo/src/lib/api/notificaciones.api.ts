import { apiFetch } from "@/lib/api/fetch";
import type {
  NotificacionesPollDto,
  NotificacionesSummaryDto,
} from "@/lib/types/notificacion";

async function parseError(res: Response): Promise<string> {
  const err = await res.json().catch(() => ({}));
  return (err as { error?: string }).error ?? "Error en la solicitud";
}

export async function pollNotificaciones(): Promise<NotificacionesPollDto> {
  const res = await apiFetch("/api/notificaciones/poll");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function getNotificaciones(): Promise<NotificacionesSummaryDto> {
  const res = await apiFetch("/api/notificaciones");
  if (!res.ok) throw new Error(await parseError(res));
  return res.json();
}

export async function markNotificacionAsRead(id: string): Promise<void> {
  const res = await apiFetch(`/api/notificaciones/${encodeURIComponent(id)}`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(await parseError(res));
}

export async function markAllNotificacionesAsRead(): Promise<void> {
  const res = await apiFetch("/api/notificaciones/marcar-todas", {
    method: "PATCH",
  });
  if (!res.ok) throw new Error(await parseError(res));
}
