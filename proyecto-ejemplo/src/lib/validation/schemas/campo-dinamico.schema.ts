import { z } from "zod";
import { MESSAGES } from "../common/messages";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

// ── Tipos de campo ────────────────────────────────────────────────────────────

export const CAMPO_DINAMICO_TIPOS = [
  "text",
  "textarea",
  "number",
  "date",
  "boolean",
  "select",
  "multiselect",
] as const;

export type CampoDinamicoTipo = (typeof CAMPO_DINAMICO_TIPOS)[number];

export const CAMPO_DINAMICO_TIPO_LABELS: Record<CampoDinamicoTipo, string> = {
  text: "Texto",
  textarea: "Texto largo",
  number: "Número",
  date: "Fecha",
  boolean: "Sí/No",
  select: "Selección",
  multiselect: "Selección múltiple",
};

export const ANCHO_GRILLA_VALUES = [12, 9, 8, 6, 4, 3, 2, 1] as const;

export type AnchoGrillaValue = (typeof ANCHO_GRILLA_VALUES)[number];

export const ANCHO_GRILLA_LABELS: Record<AnchoGrillaValue, string> = {
  12: "Ancho completo",
  9: "Tres cuartos",
  8: "Dos tercios",
  6: "Media fila",
  4: "Un tercio",
  3: "Un cuarto",
  2: "Un sexto",
  1: "Mínimo",
};

export const CLAVE_REGEX = /^[a-z][a-z0-9_]*$/;

const CLAVE_MESSAGE =
  "La clave debe empezar con una letra minúscula y usar solo letras, números y guiones bajos";

export function isCampoDinamicoOptionTipo(
  tipo: string,
): tipo is "select" | "multiselect" {
  return tipo === "select" || tipo === "multiselect";
}

// ── Opciones ──────────────────────────────────────────────────────────────────

export const campoDinamicoOpcionSchema = z.object({
  id: z.string().uuid().optional(),
  etiqueta: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  valor: z
    .string()
    .min(1, MESSAGES.required)
    .max(120, MESSAGES.maxLength(120)),
  orden: z.coerce.number().int().min(0).default(0),
  activo: z.boolean().default(true),
});

export type CampoDinamicoOpcionInput = z.output<typeof campoDinamicoOpcionSchema>;

function opcionesRules(
  data: { tipo?: string; opciones?: CampoDinamicoOpcionInput[] },
  ctx: z.RefinementCtx,
) {
  if (!data.tipo || !isCampoDinamicoOptionTipo(data.tipo)) {
    return;
  }

  const opciones = data.opciones ?? [];
  if (opciones.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Agregá al menos una opción para este tipo de campo",
      path: ["opciones"],
    });
    return;
  }

  const valores = opciones.map((o) => o.valor.trim());
  const seen = new Set<string>();
  for (let i = 0; i < valores.length; i++) {
    const v = valores[i];
    if (seen.has(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Los valores de las opciones deben ser únicos",
        path: ["opciones", i, "valor"],
      });
    }
    seen.add(v);
  }
}

function validationRangeRules(
  data: { minimo?: number; maximo?: number },
  ctx: z.RefinementCtx,
) {
  if (
    data.minimo !== undefined &&
    data.maximo !== undefined &&
    data.minimo > data.maximo
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "El mínimo no puede ser mayor que el máximo",
      path: ["maximo"],
    });
  }
}

const campoDinamicoBaseFields = {
  etiqueta: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  clave: z
    .string()
    .min(1, MESSAGES.required)
    .max(80, MESSAGES.maxLength(80))
    .regex(CLAVE_REGEX, CLAVE_MESSAGE),
  tipo: z.enum(CAMPO_DINAMICO_TIPOS),
  contexto: z.string().min(1, MESSAGES.required).default("caso"),
  placeholder: z.preprocess(
    emptyToUndefined,
    z.string().max(200, MESSAGES.maxLength(200)).optional(),
  ),
  ayuda: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).optional(),
  ),
  valor_default: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).optional(),
  ),
  ancho_grilla: z.coerce
    .number()
    .int()
    .min(1, "Debe ser entre 1 y 12")
    .max(12, "Debe ser entre 1 y 12")
    .default(12),
  requerido: z.boolean().default(false),
  minimo: z.preprocess(
    emptyToUndefined,
    z.coerce.number().optional(),
  ),
  maximo: z.preprocess(
    emptyToUndefined,
    z.coerce.number().optional(),
  ),
  longitud_maxima: z.preprocess(
    emptyToUndefined,
    z.coerce.number().int().min(1).optional(),
  ),
  regex: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).optional(),
  ),
  buscable: z.boolean().default(false),
  filtrable: z.boolean().default(false),
  visible_tabla: z.boolean().default(false),
  activo: z.boolean().default(true),
  opciones: z.array(campoDinamicoOpcionSchema).optional(),
};

export const createCampoDinamicoSchema = z
  .object(campoDinamicoBaseFields)
  .superRefine(opcionesRules)
  .superRefine(validationRangeRules);

export type CreateCampoDinamicoInput = z.output<typeof createCampoDinamicoSchema>;

export const updateCampoDinamicoSchema = z
  .object(campoDinamicoBaseFields)
  .superRefine(opcionesRules)
  .superRefine(validationRangeRules);

export type UpdateCampoDinamicoInput = z.output<typeof updateCampoDinamicoSchema>;

export const setCampoDinamicoActivoSchema = z.object({
  activo: z.boolean(),
});

export type SetCampoDinamicoActivoInput = z.output<
  typeof setCampoDinamicoActivoSchema
>;
