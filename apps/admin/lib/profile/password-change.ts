export type PasswordField = "currentPassword" | "newPassword" | "confirmation";
export type PasswordValues = Record<PasswordField, string>;
export type PasswordErrors = Partial<Record<PasswordField, string>>;

export function passwordPolicy(value: string) {
  return {
    characters: [...value].length,
    bytes: new TextEncoder().encode(value).length,
    hasContent: /\S/u.test(value),
  };
}

// UX feedback only. Bcrypt equivalence and the authoritative policy live in B2.
export function validatePasswordChange(values: PasswordValues): PasswordErrors {
  const errors: PasswordErrors = {};
  const policy = passwordPolicy(values.newPassword);
  if (!values.currentPassword)
    errors.currentPassword = "Ingresá tu contraseña actual.";
  if (policy.characters < 12)
    errors.newPassword = "Usá al menos 12 caracteres.";
  else if (policy.bytes > 72)
    errors.newPassword = "La contraseña supera el máximo de 72 bytes UTF-8.";
  else if (!policy.hasContent)
    errors.newPassword = "La contraseña no puede contener sólo espacios.";
  else if (values.newPassword === values.currentPassword)
    errors.newPassword = "La nueva contraseña debe ser diferente de la actual.";
  if (!values.confirmation)
    errors.confirmation = "Confirmá tu nueva contraseña.";
  else if (values.confirmation !== values.newPassword)
    errors.confirmation = "Las contraseñas no coinciden.";
  return errors;
}

export const STRENGTH_LABELS = [
  "Muy débil",
  "Débil",
  "Aceptable",
  "Fuerte",
] as const;

// Conservative local heuristic, not an entropy estimate or a policy validator.
export function passwordStrength(value: string): 1 | 2 | 3 | 4 {
  const length = [...value].length;
  const unique = new Set(value).size;
  if (
    length < 8 ||
    unique < 4 ||
    /password|contrase[ñn]a|qwerty|123456|abcdef/i.test(value)
  )
    return 1;
  if (length < 12 || unique < 6) return 2;
  if (length >= 16 && unique >= 8) return 4;
  return 3;
}

export type PasswordChangeFailure = {
  ok: false;
  code: string;
  message: string;
  field?: "currentPassword" | "newPassword";
  retryAfterSeconds?: number;
};
export type PasswordChangeResult = { ok: true } | PasswordChangeFailure;

export function mapPasswordChangeError(
  status: number,
  body: unknown,
): PasswordChangeFailure {
  const data =
    body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const code = typeof data.code === "string" ? data.code : "";
  const messages: Record<
    string,
    { message: string; field?: "currentPassword" | "newPassword" }
  > = {
    CURRENT_PASSWORD_INVALID: {
      message: "La contraseña actual no es correcta.",
      field: "currentPassword",
    },
    PASSWORD_POLICY_VIOLATION: {
      message:
        "Usá al menos 12 caracteres, hasta 72 bytes UTF-8 y no sólo espacios.",
      field: "newPassword",
    },
    PASSWORD_REUSED: {
      message: "La nueva contraseña debe ser diferente de la actual.",
      field: "newPassword",
    },
    PASSWORD_CHANGE_UNAVAILABLE: {
      message:
        "No se pudo cambiar la contraseña. Intentá nuevamente más tarde.",
    },
    CREDENTIALS_CHANGED: {
      message:
        "Las credenciales cambiaron. Volvé a ingresar la contraseña actual.",
      field: "currentPassword",
    },
    REQUEST_ORIGIN_NOT_ALLOWED: {
      message:
        "No se pudo validar el origen de la solicitud. Recargá la página e intentá nuevamente.",
    },
  };
  if (status === 429) {
    const seconds = data.retryAfterSeconds;
    const retryAfterSeconds =
      typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
        ? Math.min(900, Math.ceil(seconds))
        : 900;
    return {
      ok: false,
      code: "PASSWORD_CHANGE_RATE_LIMITED",
      message:
        "Alcanzaste el límite de intentos. Esperá antes de volver a intentar.",
      retryAfterSeconds,
    };
  }
  if (status === 401)
    return {
      ok: false,
      code: "UNAUTHENTICATED",
      message: "Tu sesión expiró. Volvé a iniciar sesión.",
    };
  if (Object.hasOwn(messages, code))
    return { ok: false, code, ...messages[code]! };
  if (
    status === 403 &&
    data.message === "RealData es un entorno visual de sólo lectura."
  ) {
    return {
      ok: false,
      code: "READ_ONLY",
      message: "RealData es un entorno visual de sólo lectura.",
    };
  }
  return {
    ok: false,
    code: "PASSWORD_CHANGE_UNAVAILABLE",
    message: "No se pudo cambiar la contraseña. Intentá nuevamente más tarde.",
  };
}
