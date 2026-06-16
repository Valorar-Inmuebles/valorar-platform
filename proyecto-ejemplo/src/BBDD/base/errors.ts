export class UniqueViolationError extends Error {
  readonly code = "23505";
  readonly constraint?: string;
  readonly detail?: string;

  constructor(
    message = "Registro duplicado",
    options?: { constraint?: string; detail?: string },
  ) {
    super(message);
    this.name = "UniqueViolationError";
    this.constraint = options?.constraint;
    this.detail = options?.detail;
  }
}

export type PostgresErrorShape = {
  code: string;
  message?: string;
  detail?: string;
  constraint?: string;
  table?: string;
  schema?: string;
};

export function isPostgresError(error: unknown): error is PostgresErrorShape {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as { code: unknown }).code === "string"
  );
}

/** Logging temporal para diagnosticar 23505 en reorder de etapas. */
export function logPostgresError(
  context: string,
  error: unknown,
): void {
  if (isPostgresError(error)) {
    console.error(`[${context}] Postgres error`, {
      code: error.code,
      constraint: error.constraint,
      detail: error.detail,
      message: error.message,
      table: error.table,
      stack: error instanceof Error ? error.stack : undefined,
    });
    return;
  }

  console.error(`[${context}] Error`, {
    error,
    stack: error instanceof Error ? error.stack : undefined,
  });
}

export function rethrowDbError(error: unknown): never {
  if (isPostgresError(error)) {
    if (error.code === "23505") {
      throw new UniqueViolationError(error.detail ?? error.message, {
        constraint: error.constraint,
        detail: error.detail,
      });
    }
  }
  throw error;
}
