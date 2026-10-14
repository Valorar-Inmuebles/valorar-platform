import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
} from '@nestjs/common';
import type { Response } from 'express';
import { PasswordChangeError } from './password-change.errors';
import { PasswordChangeRateLimitError } from './password-change.guard';

@Catch()
export class PasswordChangeFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = error instanceof HttpException ? error.getStatus() : 503;
    const body = error instanceof HttpException ? error.getResponse() : null;
    const isPolicy =
      status === 422 &&
      typeof body === 'object' &&
      body !== null &&
      'code' in body &&
      body.code === 'PASSWORD_POLICY_VIOLATION';
    const safeBody =
      error instanceof PasswordChangeError || isPolicy
        ? body
        : {
            statusCode: status,
            code:
              status === 401
                ? 'UNAUTHENTICATED'
                : status >= 500
                  ? 'PASSWORD_CHANGE_UNAVAILABLE'
                  : 'INVALID_REQUEST',
            message:
              status === 401
                ? 'Tu sesión no es válida.'
                : status >= 500
                  ? 'No se pudo cambiar la contraseña. Intentá nuevamente más tarde.'
                  : 'Revisá los campos de la solicitud.',
          };
    response.setHeader('Cache-Control', 'no-store');
    response.status(status).json({
      ...(typeof safeBody === 'object' ? safeBody : {}),
      ...(error instanceof PasswordChangeRateLimitError
        ? { retryAfterSeconds: error.retryAfterSeconds }
        : {}),
    });
  }
}
