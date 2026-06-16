import { z } from "zod";

import { COMENTARIO_ENTIDAD_TIPOS } from "@/lib/types/comentario";
import { MESSAGES } from "../common/messages";

const contenidoSchema = z
  .string()
  .trim()
  .min(1, MESSAGES.required)
  .max(10000, MESSAGES.maxLength(10000));

export const comentarioListQuerySchema = z.object({
  entidad_tipo: z.enum(COMENTARIO_ENTIDAD_TIPOS),
  entidad_id: z.string().uuid("ID de entidad inválido"),
});

export const comentarioCreateSchema = z.object({
  entidad_tipo: z.enum(COMENTARIO_ENTIDAD_TIPOS),
  entidad_id: z.string().uuid("ID de entidad inválido"),
  contenido: contenidoSchema,
});

export const comentarioUpdateSchema = z.object({
  contenido: contenidoSchema,
});

export const comentarioUsuariosMencionQuerySchema = z.object({
  q: z.string().max(100).optional().default(""),
});

export type ComentarioCreateInput = z.infer<typeof comentarioCreateSchema>;
export type ComentarioUpdateInput = z.infer<typeof comentarioUpdateSchema>;
