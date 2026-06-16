import { z } from "zod";
import { MESSAGES } from "../common/messages";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const uuidSchema = z.string().uuid(MESSAGES.required);

export const valorDinamicoInputSchema = z.object({
  campo_id: uuidSchema,
  valor: z.unknown(),
});

export const casoTramitePayloadSchema = z.object({
  valores_dinamicos: z.array(valorDinamicoInputSchema).optional(),
  tramite_plantilla_id: z.preprocess(
    emptyToUndefined,
    uuidSchema.optional(),
  ),
});

export const createCasoSchema = z.object({
  cliente_id: z.string().min(1, MESSAGES.required).uuid(MESSAGES.required),
  nombre: z.string().min(1, MESSAGES.required).max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(2000, MESSAGES.maxLength(2000)).optional(),
  ),
  practica_id: z.string().min(1, MESSAGES.required).uuid(MESSAGES.required),
});

export type CreateCasoInput = z.output<typeof createCasoSchema>;

export const createCasoApiSchema = createCasoSchema.merge(casoTramitePayloadSchema);

export type CreateCasoApiInput = z.output<typeof createCasoApiSchema>;

export const updateCasoSchema = createCasoSchema.partial();

export type UpdateCasoInput = z.output<typeof updateCasoSchema>;

export const updateCasoApiSchema = updateCasoSchema.merge(casoTramitePayloadSchema);

export type UpdateCasoApiInput = z.output<typeof updateCasoApiSchema>;

/** Persisted caso row fields exposed by GET /api/casos/[id] and POST /api/casos. */
export const casoRowSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  cliente_id: uuidSchema,
  descripcion: z.string().nullable(),
  estado: z.string().nullable(),
  nombre: z.string().nullable(),
  numero: z.string().nullable(),
  plantilla_id: uuidSchema.nullable(),
  practica_id: uuidSchema,
  created_at: z.string().nullable(),
});

export type CasoRowOutput = z.output<typeof casoRowSchema>;

export const casoDetailSchema = casoRowSchema.extend({
  has_expedientes: z.boolean(),
});

export type CasoDetailOutput = z.output<typeof casoDetailSchema>;
