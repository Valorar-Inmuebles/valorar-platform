import { z } from "zod";

export const ansesPasswordSchema = z.object({
  password: z.string().trim().min(1, "La contraseña es requerida"),
});

export type AnsesPasswordInput = z.output<typeof ansesPasswordSchema>;