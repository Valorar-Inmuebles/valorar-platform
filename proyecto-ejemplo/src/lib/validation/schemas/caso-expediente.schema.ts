import { z } from "zod";
import { MESSAGES } from "../common/messages";

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

export const casoExpedienteSchema = z.object({
  nombre: z.string().min(1, MESSAGES.required).max(200, MESSAGES.maxLength(200)),
  tipo: z.preprocess(
    emptyToUndefined,
    z.string().max(120, MESSAGES.maxLength(120)).optional(),
  ),
  organismo_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid(MESSAGES.required).optional(),
  ),
  parte_representada_id: z.preprocess(
    emptyToUndefined,
    z.string().uuid(MESSAGES.required).optional(),
  ),
});

export type CasoExpedienteInput = z.output<typeof casoExpedienteSchema>;

export const updateCasoExpedienteSchema = casoExpedienteSchema.partial();

export type UpdateCasoExpedienteInput = z.output<typeof updateCasoExpedienteSchema>;
