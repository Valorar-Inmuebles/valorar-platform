import { z } from "zod";
import { MESSAGES } from "../common/messages";

function emptyToNull(v: unknown): unknown {
  return typeof v === "string" && v.trim() === "" ? null : v;
}

const optionalEmail = z.preprocess(
  emptyToNull,
  z
    .string()
    .email(MESSAGES.invalidEmail)
    .max(320, MESSAGES.maxLength(320))
    .nullable()
    .optional(),
);

const optionalText = (max: number) =>
  z.preprocess(
    emptyToNull,
    z.string().max(max, MESSAGES.maxLength(max)).nullable().optional(),
  );

export const tenantFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, MESSAGES.required)
    .max(200, MESSAGES.maxLength(200)),
  email: optionalEmail,
  telefono: optionalText(50),
});

export type TenantFormOutput = z.output<typeof tenantFormSchema>;
