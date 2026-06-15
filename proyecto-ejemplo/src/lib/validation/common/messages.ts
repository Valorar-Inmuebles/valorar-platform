/**
 * Centralized validation error messages.
 * Use these constants in Zod schemas to keep messages consistent.
 */

export const MESSAGES = {
  required: "Este campo es obligatorio",
  invalidEmail: "Ingresá un email válido",
  invalidPhone: "Ingresá un teléfono válido",
  invalidCUIL: "CUIL inválido. Formato esperado: 20-12345678-0",
  invalidCUILChecksum: "CUIL inválido. El dígito verificador no es correcto",
  invalidCUIT: "CUIT inválido. Formato esperado: 30-12345678-9",
  invalidCUITChecksum: "CUIT inválido. El dígito verificador no es correcto",
  invalidDNI: "DNI inválido. Debe tener 7 u 8 dígitos",
  invalidName: "El nombre contiene caracteres no permitidos",
  invalidRazonSocial: "La razón social contiene caracteres no permitidos",
  invalidDate: "Fecha inválida. Usá el formato dd/mm/aaaa",
  dateInFuture: "La fecha no puede ser futura",
  dateTooOld: "La fecha debe ser posterior al año 1900",
  minLength: (n: number) => `Mínimo ${n} caracteres`,
  maxLength: (n: number) => `Máximo ${n} caracteres`,
} as const;
