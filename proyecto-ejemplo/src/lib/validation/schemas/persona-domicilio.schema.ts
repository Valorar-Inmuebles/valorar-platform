import { z } from "zod";
import { MESSAGES } from "../common/messages";

// ── Helpers ───────────────────────────────────────────────────────────────────

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

// ── Enums ─────────────────────────────────────────────────────────────────────

export const CATEGORIAS_DOMICILIO = ["fiscal", "particular", "laboral", "otro"] as const;

export type CategoriaDomicilio = (typeof CATEGORIAS_DOMICILIO)[number];

export const CATEGORIA_DOMICILIO_LABELS: Record<CategoriaDomicilio, string> = {
  fiscal:     "Fiscal",
  particular: "Particular",
  laboral:    "Laboral",
  otro:       "Otro",
};

// ── Schema ────────────────────────────────────────────────────────────────────

export const domicilioSchema = z.object({
  categoria:     z.enum(CATEGORIAS_DOMICILIO),
  calle:         z.string().min(1, MESSAGES.required).max(255, MESSAGES.maxLength(255)),
  numero:        z.string().min(1, MESSAGES.required).max(20, MESSAGES.maxLength(20)),
  piso:          z.preprocess(emptyToUndefined, z.string().max(10, MESSAGES.maxLength(10)).optional()),
  departamento:  z.preprocess(emptyToUndefined, z.string().max(10, MESSAGES.maxLength(10)).optional()),
  barrio:        z.preprocess(emptyToUndefined, z.string().max(100, MESSAGES.maxLength(100)).optional()),
  localidad_id:  z.string().min(1, MESSAGES.required).uuid(MESSAGES.required),
  codigo_postal: z.preprocess(emptyToUndefined, z.string().max(10, MESSAGES.maxLength(10)).optional()),
  descripcion:   z.preprocess(emptyToUndefined, z.string().max(255, MESSAGES.maxLength(255)).optional()),
  predeterminado: z.boolean().default(false),
  activo:        z.boolean().default(true),
});

export type DomicilioInput = z.output<typeof domicilioSchema>;
