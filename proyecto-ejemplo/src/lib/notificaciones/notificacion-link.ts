const NOTIFICACION_HREF_PATTERN =
  /\/(?:clientes|casos|expedientes|usuarios|legajos)\/[0-9a-f-]+/i;

/** Extrae la ruta interna embebida en mensajes legacy (sin campo `link`). */
export function extractNotificacionHref(mensaje: string): string | null {
  const match = mensaje.match(NOTIFICACION_HREF_PATTERN);
  return match?.[0] ?? null;
}
