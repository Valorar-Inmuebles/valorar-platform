import { z } from "zod";

import { DOCUMENTO_ENTIDAD_TIPOS } from "@/lib/types/documento";
import { MESSAGES } from "../common/messages";

const nombreVisibleSchema = z
  .string()
  .trim()
  .min(1, MESSAGES.required)
  .max(255, MESSAGES.maxLength(255));

export const documentoListQuerySchema = z.object({
  entidad_tipo: z.enum(DOCUMENTO_ENTIDAD_TIPOS),
  entidad_id: z.string().uuid("ID de entidad inválido"),
});

/** Campos de texto del multipart POST /api/documentos (el archivo se valida en el service). */
export const documentoCreateFieldsSchema = z.object({
  entidad_tipo: z.enum(DOCUMENTO_ENTIDAD_TIPOS),
  entidad_id: z.string().uuid("ID de entidad inválido"),
  nombre_visible: nombreVisibleSchema.optional(),
  descripcion: z
    .string()
    .trim()
    .max(1000, MESSAGES.maxLength(1000))
    .optional()
    .transform((v) => (v === "" ? undefined : v)),
});

export type DocumentoCreateFieldsInput = z.infer<typeof documentoCreateFieldsSchema>;
