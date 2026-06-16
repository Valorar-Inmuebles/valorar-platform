import { z } from "zod";
import { MESSAGES } from "../common/messages";
import {
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
  plantillaSetupCampoSchema,
} from "./plantilla-setup.schema";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const plantillaMetaSchema = z.object({
  nombre: z
    .string()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  descripcion: z.preprocess(
    emptyToUndefined,
    z.string().max(500, MESSAGES.maxLength(500)).optional(),
  ),
  activo: z.boolean(),
});

const camposSchema = z
  .array(plantillaSetupCampoSchema)
  .min(1, "Agregá al menos un campo a la plantilla");

const prioridadSchema = z.coerce.number().int().min(0).max(9999).default(100);

export const createPlantillaAdminCasoSchema = plantillaMetaSchema.extend({
  contexto: z.literal(PLANTILLA_CONTEXTO_CASO),
  practica_id: z.string().uuid(MESSAGES.required),
  prioridad: prioridadSchema,
  campos: camposSchema,
});

export const createPlantillaAdminExpedienteSchema = plantillaMetaSchema.extend({
  contexto: z.literal(PLANTILLA_CONTEXTO_EXPEDIENTE),
  fuero_id: z.string().uuid(MESSAGES.required),
  objeto_id: z.string().uuid(MESSAGES.required),
  prioridad: prioridadSchema,
  campos: camposSchema,
});

export const createPlantillaAdminSchema = z.discriminatedUnion("contexto", [
  createPlantillaAdminCasoSchema,
  createPlantillaAdminExpedienteSchema,
]);

export type CreatePlantillaAdminInput = z.output<typeof createPlantillaAdminSchema>;

export const updatePlantillaAdminSchema = createPlantillaAdminSchema;

export type UpdatePlantillaAdminInput = z.output<typeof updatePlantillaAdminSchema>;

export const PLANTILLA_CONTEXTO_LABELS: Record<string, string> = {
  [PLANTILLA_CONTEXTO_CASO]: "Caso",
  [PLANTILLA_CONTEXTO_EXPEDIENTE]: "Expediente",
};

export const PLANTILLA_CONTEXTO_OPTIONS = [
  { value: PLANTILLA_CONTEXTO_CASO, label: PLANTILLA_CONTEXTO_LABELS[PLANTILLA_CONTEXTO_CASO] },
  {
    value: PLANTILLA_CONTEXTO_EXPEDIENTE,
    label: PLANTILLA_CONTEXTO_LABELS[PLANTILLA_CONTEXTO_EXPEDIENTE],
  },
] as const;
