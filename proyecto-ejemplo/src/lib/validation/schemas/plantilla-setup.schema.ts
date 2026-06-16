import { z } from "zod";
import { MESSAGES } from "../common/messages";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

export const PLANTILLA_CONTEXTO_CASO = "caso";
export const PLANTILLA_CONTEXTO_EXPEDIENTE = "expediente";

export const plantillaSetupCampoSchema = z.object({
  campo_dinamico_id: z.string().uuid(MESSAGES.required),
  orden: z.number().int().min(0),
  requerido: z.boolean(),
});

export const plantillaSetupSchema = z.object({
  practica_id: z.string().uuid(MESSAGES.required),
  plantilla: z.object({
    nombre: z
      .string()
      .min(1, MESSAGES.required)
      .max(200, MESSAGES.maxLength(200)),
    descripcion: z.preprocess(
      emptyToUndefined,
      z.string().max(500, MESSAGES.maxLength(500)).optional(),
    ),
  }),
  campos: z
    .array(plantillaSetupCampoSchema)
    .min(1, "Agregá al menos un campo a la plantilla"),
  prioridad: z.coerce.number().int().min(0).max(9999).default(100),
});

export type PlantillaSetupInput = z.output<typeof plantillaSetupSchema>;

export const updatePlantillaSetupSchema = plantillaSetupSchema;

export type UpdatePlantillaSetupInput = z.output<
  typeof updatePlantillaSetupSchema
>;

export const plantillaSetupExpedienteSchema = z.object({
  fuero_id: z.string().uuid(MESSAGES.required),
  objeto_id: z.string().uuid(MESSAGES.required),
  plantilla: z.object({
    nombre: z
      .string()
      .min(1, MESSAGES.required)
      .max(200, MESSAGES.maxLength(200)),
    descripcion: z.preprocess(
      emptyToUndefined,
      z.string().max(500, MESSAGES.maxLength(500)).optional(),
    ),
  }),
  campos: z
    .array(plantillaSetupCampoSchema)
    .min(1, "Agregá al menos un campo a la plantilla"),
  prioridad: z.coerce.number().int().min(0).max(9999).default(100),
});

export type PlantillaSetupExpedienteInput = z.output<
  typeof plantillaSetupExpedienteSchema
>;

export const updatePlantillaSetupExpedienteSchema = plantillaSetupExpedienteSchema;

export type UpdatePlantillaSetupExpedienteInput = z.output<
  typeof updatePlantillaSetupExpedienteSchema
>;

export const plantillaSetupReglaQuerySchema = z.object({
  practica_id: z.string().uuid("practica_id es requerido"),
});

export const plantillaSetupExpedienteReglaQuerySchema = z.object({
  fuero_id: z.string().uuid("fuero_id es requerido"),
  objeto_id: z.string().uuid("objeto_id es requerido"),
});

export const plantillaCamposCasoQuerySchema = z.object({
  practica_id: z.string().uuid("practica_id inválido"),
  plantilla_id: z.string().uuid("plantilla_id inválido").optional(),
});

export const plantillaCamposExpedienteQuerySchema = z.object({
  fuero_id: z.string().uuid("fuero_id inválido"),
  objeto_id: z.string().uuid("objeto_id inválido"),
  plantilla_id: z.string().uuid("plantilla_id inválido").optional(),
});
