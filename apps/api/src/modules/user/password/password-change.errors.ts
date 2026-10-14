import { HttpException } from '@nestjs/common';

export class PasswordChangeError extends HttpException {
  constructor(
    statusCode: number,
    code: string,
    message: string,
    field?: string,
  ) {
    super(
      { statusCode, code, message, ...(field ? { field } : {}) },
      statusCode,
    );
  }
}

export function passwordChangeUnavailable(): PasswordChangeError {
  return new PasswordChangeError(
    503,
    'PASSWORD_CHANGE_UNAVAILABLE',
    'No se pudo cambiar la contraseña. Intentá nuevamente más tarde.',
  );
}
