/** Errores de navegación de Next.js (redirect, notFound) — no son fallos reales. */
export function isNextNavigationError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const digest = (error as { digest?: string }).digest;
  return digest === "NEXT_REDIRECT" || digest === "NEXT_NOT_FOUND";
}

/** Errores de dominio esperados: no se persisten en la tabla error. */
export function isHandledDomainError(error: unknown): boolean {
  if (isNextNavigationError(error)) return true;

  if (!(error instanceof Error)) return false;

  if (error.name === "NotFoundError") return true;
  if (error.name === "UsuarioNoHabilitadoError") return true;
  if (error.name === "CasoTramiteValoresValidationError") return true;

  if (error.name === "PlantillaSetupError") return true;

  if ("field" in error && "code" in error) return true;

  const message = error.message.toLowerCase();
  if (message.includes("no autenticado")) return true;
  if (message.includes("datos inválidos")) return true;

  return false;
}
