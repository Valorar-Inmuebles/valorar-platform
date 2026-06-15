import { z } from "zod";
import { parsePhoneNumber } from "libphonenumber-js";
import { MESSAGES } from "../common/messages";
import { normalizePhone } from "../common/parsers";

// ── Enums ─────────────────────────────────────────────────────────────────────

export const CANALES = ["email", "telefono", "whatsapp", "web"] as const;
export const CATEGORIAS = ["personal", "laboral", "otro"] as const;

export type Canal = (typeof CANALES)[number];
export type Categoria = (typeof CATEGORIAS)[number];

export const CANAL_LABELS: Record<Canal, string> = {
  email: "Email",
  telefono: "Teléfono",
  whatsapp: "WhatsApp",
  web: "Web",
};

export const CATEGORIA_LABELS: Record<Categoria, string> = {
  personal: "Personal",
  laboral: "Laboral",
  otro: "Otro",
};

// ── Base schema ───────────────────────────────────────────────────────────────

const baseContactoSchema = z.object({
  canal: z.enum(CANALES),
  categoria: z.enum(CATEGORIAS),
  valor: z.string().min(1, MESSAGES.required).max(255),
  descripcion: z.string().max(255).optional(),
  predeterminado: z.boolean().default(false),
  verificado: z.boolean().default(false),
  pais_codigo: z.string().length(2).default("AR"),
});

// ── Contacto schema with canal-based valor validation ─────────────────────────

export const contactoSchema = baseContactoSchema.superRefine((data, ctx) => {
  const { canal, valor, pais_codigo } = data;

  if (!valor) return;

  if (canal === "email") {
    const result = z.string().email().safeParse(valor);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valor"],
        message: MESSAGES.invalidEmail,
      });
    }
  } else if (canal === "telefono" || canal === "whatsapp") {
    try {
      const parsed = parsePhoneNumber(
        valor,
        (pais_codigo ?? "AR") as Parameters<typeof parsePhoneNumber>[1],
      );
      if (!parsed?.isValid()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["valor"],
          message: MESSAGES.invalidPhone,
        });
      }
    } catch {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valor"],
        message: MESSAGES.invalidPhone,
      });
    }
  } else if (canal === "web") {
    const result = z.string().url().safeParse(valor);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["valor"],
        message: "URL inválida. Debe comenzar con https://",
      });
    }
  }
});

export type ContactoInput = z.output<typeof contactoSchema>;

// ── Normalizer: call before persisting ────────────────────────────────────────

export function normalizeContactoValor(
  canal: Canal,
  valor: string,
  paisCodigo = "AR",
): string {
  if (canal === "telefono" || canal === "whatsapp") {
    return normalizePhone(valor, paisCodigo);
  }
  return valor.trim();
}
