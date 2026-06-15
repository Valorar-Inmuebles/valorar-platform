import { NotFoundError } from "@/lib/server/not-found-error";
import { UsuarioNoHabilitadoError } from "@/lib/auth/errors";
import { CasoTramiteValoresValidationError } from "@/lib/server/services/caso-tramite-valores.service";
import {
  isHandledDomainError,
  isNextNavigationError,
} from "@/lib/server/errors/is-handled-error";

type ApiErrorResponse = {
  status: number;
  body: Record<string, unknown>;
};

function isFieldError(
  error: unknown,
): error is Error & { field: string; code: string; message: string } {
  return (
    error instanceof Error &&
    "field" in error &&
    "code" in error &&
    typeof (error as { field: unknown }).field === "string" &&
    typeof (error as { code: unknown }).code === "string"
  );
}

export function mapKnownApiError(error: unknown): ApiErrorResponse | null {
  if (isNextNavigationError(error)) {
    throw error;
  }

  if (error instanceof NotFoundError) {
    return { status: 404, body: { error: error.message } };
  }

  if (error instanceof UsuarioNoHabilitadoError) {
    return { status: 403, body: { error: error.message } };
  }

  if (error instanceof Error && error.message.includes("No autenticado")) {
    return { status: 401, body: { error: error.message } };
  }

  if (error instanceof CasoTramiteValoresValidationError) {
    return {
      status: 422,
      body: { code: "TRAMITE_VALIDATION", errors: error.errors },
    };
  }

  if (error instanceof Error && error.name === "PlantillaSetupError") {
    return { status: 409, body: { error: error.message } };
  }

  if (isFieldError(error)) {
    const status = error.name === "PersonaFieldError" ? 422 : 409;

    if (error.name === "PersonaFieldError") {
      return {
        status,
        body: {
          message: error.message,
          field: error.field,
          code: error.code,
        },
      };
    }

    return {
      status,
      body: {
        code: error.code,
        field: error.field,
        message: error.message,
      },
    };
  }

  return null;
}

export function shouldLogApiError(error: unknown): boolean {
  if (isNextNavigationError(error)) return false;
  if (isHandledDomainError(error)) return false;
  return true;
}
