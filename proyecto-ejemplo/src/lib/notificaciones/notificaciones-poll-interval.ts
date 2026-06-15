const DEFAULT_SECONDS = 60;

/** Intervalo de polling de notificaciones en milisegundos (cliente). */
export function getNotificacionesPollIntervalMs(): number {
  const raw = process.env.NOTIFICACIONES_POLL_INTERVAL_SECONDS?.trim();
  if (!raw) return DEFAULT_SECONDS * 1000;

  const seconds = Number.parseInt(raw, 10);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return DEFAULT_SECONDS * 1000;
  }

  return seconds * 1000;
}
