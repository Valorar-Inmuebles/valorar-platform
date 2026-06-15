export type PersonaDisplayInput = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

/**
 * Persona humana: "Apellido Nombre".
 * Persona jurídica: razón social (nombre).
 */
export function formatPersonaDisplayName(
  persona: PersonaDisplayInput | null | undefined,
  fallback = "—",
): string {
  if (!persona) return fallback;
  if (persona.tipo === "juridica") {
    return (persona.nombre ?? "").trim() || fallback;
  }
  const full = [persona.apellido, persona.nombre]
    .filter(Boolean)
    .join(" ")
    .trim();
  return full || fallback;
}

/** Clave normalizada para ordenar tablas por nombre visible. */
export function personaDisplaySortKey(
  persona: PersonaDisplayInput | null | undefined,
): string {
  return formatPersonaDisplayName(persona, "").toLowerCase();
}

export function unwrapPersonaRelation<T extends PersonaDisplayInput>(
  raw: T | T[] | null | undefined,
): T | null {
  if (raw == null) return null;
  return Array.isArray(raw) ? (raw[0] ?? null) : raw;
}

export function formatClienteDisplayName(
  cliente: { persona?: PersonaDisplayInput | PersonaDisplayInput[] | null },
  fallback = "—",
): string {
  const persona = unwrapPersonaRelation(cliente.persona);
  return formatPersonaDisplayName(persona, fallback);
}
