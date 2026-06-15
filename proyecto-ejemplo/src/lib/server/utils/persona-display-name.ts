type PersonaNombreRow = {
  tipo?: string | null;
  nombre?: string | null;
  apellido?: string | null;
};

export function personaDisplayName(persona: PersonaNombreRow | null | undefined): string {
  if (!persona) return "Usuario";
  if (persona.tipo === "juridica") {
    return (persona.nombre ?? "").trim() || "Usuario";
  }
  const full = [persona.nombre, persona.apellido].filter(Boolean).join(" ").trim();
  return full || "Usuario";
}

export function unwrapOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}
