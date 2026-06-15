import { z } from "zod";
import { PERSON_NAME_REGEX, RAZON_SOCIAL_REGEX, DNI_REGEX, CUIL_REGEX } from "../common/patterns";
import { MESSAGES } from "../common/messages";
import { normalizeDNI, normalizeCUIL, parseFechaNacimiento, validateCUILChecksum } from "../common/parsers";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

// ── Tipo ──────────────────────────────────────────────────────────────────────

export const TIPOS = ["humana", "juridica"] as const;
export type TipoPersona = (typeof TIPOS)[number];

export const TIPO_LABELS: Record<TipoPersona, string> = {
  humana: "Humana",
  juridica: "Jurídica",
};

// ── Sexo ──────────────────────────────────────────────────────────────────────

export const SEXOS = ["masculino", "femenino", "no_binario", "no_especificado"] as const;
export type Sexo = (typeof SEXOS)[number];

export const SEXO_LABELS: Record<Sexo, string> = {
  masculino: "Masculino",
  femenino: "Femenino",
  no_binario: "No binario",
  no_especificado: "No especificado",
};

// ── Refinement condicional ────────────────────────────────────────────────────
// Aplica reglas required según tipo. Se reutiliza en create y update.

function conditionalPersonaRules(
  data: {
    tipo?: string;
    nombre?: string;
    apellido?: string;
    documento?: string;
    cuit?: string;
  },
  ctx: z.RefinementCtx
) {
  if (!data.tipo) return;

  if (data.tipo === "humana") {
    // nombre: strict — no digits, only letters/spaces/accents/apostrophe/hyphen
    if (data.nombre && !PERSON_NAME_REGEX.test(data.nombre)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.invalidName,
        path: ["nombre"],
      });
    }
    if (!data.apellido?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.required,
        path: ["apellido"],
      });
    }
    if (!data.documento) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.required,
        path: ["documento"],
      });
    }
  }

  if (data.tipo === "juridica") {
    // nombre: permissive — allows digits, dot, ampersand, slash, parentheses
    if (data.nombre && !RAZON_SOCIAL_REGEX.test(data.nombre)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.invalidRazonSocial,
        path: ["nombre"],
      });
    }
    if (!data.cuit) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: MESSAGES.required,
        path: ["cuit"],
      });
    }
  }
}

// ── Base fields ───────────────────────────────────────────────────────────────

const basePersonaFields = {
  tipo: z.enum(TIPOS),

  // Regex applied conditionally in superRefine: PERSON_NAME_REGEX for humana,
  // RAZON_SOCIAL_REGEX for juridica.
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(100, MESSAGES.maxLength(100)),

  // Optional at field level; conditionally required via superRefine for "humana"
  apellido: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .max(100, MESSAGES.maxLength(100))
      .regex(PERSON_NAME_REGEX, MESSAGES.invalidName)
      .optional()
  ),

  // Strips dots → validates digit count. Conditionally required for "humana".
  documento: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? normalizeDNI(v) : undefined),
    z.string().regex(DNI_REGEX, MESSAGES.invalidDNI).optional()
  ),

  // Strips dashes → validates prefix + digit count + checksum. Optional for "humana".
  cuil: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? normalizeCUIL(v) : undefined),
    z
      .string()
      .regex(CUIL_REGEX, MESSAGES.invalidCUIL)
      .refine(validateCUILChecksum, MESSAGES.invalidCUILChecksum)
      .optional()
  ),

  // CUIT for "juridica". Same format as CUIL + checksum; conditionally required.
  cuit: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? normalizeCUIL(v) : undefined),
    z
      .string()
      .regex(CUIL_REGEX, MESSAGES.invalidCUIT)
      .refine(validateCUILChecksum, MESSAGES.invalidCUITChecksum)
      .optional()
  ),

  sexo: z.preprocess(emptyToUndefined, z.enum(SEXOS).optional()),

  fecha_nacimiento: z.preprocess(
    (v) => (typeof v === "string" && v.trim() ? parseFechaNacimiento(v) : undefined),
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, MESSAGES.invalidDate)
      .refine(
        (iso) => new Date(iso + "T00:00:00") <= new Date(),
        MESSAGES.dateInFuture
      )
      .refine(
        (iso) => new Date(iso + "T00:00:00").getFullYear() >= 1900,
        MESSAGES.dateTooOld
      )
      .optional()
  ),
};

// ── createPersonaSchema ───────────────────────────────────────────────────────

export const createPersonaSchema = z
  .object(basePersonaFields)
  .superRefine(conditionalPersonaRules);

export type CreatePersonaInput = z.infer<typeof createPersonaSchema>;

// ── updatePersonaSchema ───────────────────────────────────────────────────────
// All fields optional for partial updates; same conditional rules apply when
// tipo is present (edit form always sends all fields).

export const updatePersonaSchema = z
  .object(basePersonaFields)
  .partial()
  .superRefine(conditionalPersonaRules);

export type UpdatePersonaInput = z.infer<typeof updatePersonaSchema>;
