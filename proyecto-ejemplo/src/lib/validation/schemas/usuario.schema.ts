import { z } from "zod";
import { PERSON_NAME_REGEX } from "../common/patterns";
import { MESSAGES } from "../common/messages";

const MIN_PASSWORD_LENGTH = 8;

function emptyToUndefined(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? undefined : v;
}

const nombreField = z
  .string()
  .min(1, MESSAGES.required)
  .max(100, MESSAGES.maxLength(100))
  .regex(PERSON_NAME_REGEX, MESSAGES.invalidName);

const apellidoField = z
  .string()
  .min(1, MESSAGES.required)
  .max(100, MESSAGES.maxLength(100))
  .regex(PERSON_NAME_REGEX, MESSAGES.invalidName);

const rolIdsField = z
  .array(z.string().uuid())
  .min(1, "Seleccioná al menos un rol");

export const createUsuarioSchema = z.object({
  email: z
    .string()
    .min(1, MESSAGES.required)
    .email(MESSAGES.invalidEmail)
    .transform((v) => v.trim().toLowerCase()),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, MESSAGES.minLength(MIN_PASSWORD_LENGTH)),
  nombre: nombreField,
  apellido: apellidoField,
  rol_ids: rolIdsField,
  activo: z.boolean().default(true),
  tenant_id: z.string().uuid().optional(),
});

export const updateUsuarioSchema = z.object({
  email: z
    .string()
    .min(1, MESSAGES.required)
    .email(MESSAGES.invalidEmail)
    .transform((v) => v.trim().toLowerCase()),
  password: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .min(MIN_PASSWORD_LENGTH, MESSAGES.minLength(MIN_PASSWORD_LENGTH))
      .optional(),
  ),
  nombre: nombreField,
  apellido: apellidoField,
  rol_ids: rolIdsField,
  activo: z.boolean(),
  tenant_id: z.string().uuid().optional(),
});

export type CreateUsuarioInput = z.input<typeof createUsuarioSchema>;
export type CreateUsuarioOutput = z.output<typeof createUsuarioSchema>;
export type UpdateUsuarioInput = z.input<typeof updateUsuarioSchema>;
export type UpdateUsuarioOutput = z.output<typeof updateUsuarioSchema>;

export const setUsuarioActivoSchema = z.object({
  activo: z.boolean(),
});
