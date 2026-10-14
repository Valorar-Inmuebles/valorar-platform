import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { getCorsOrigin } from '../../auth/constants/auth.constants';
import { PasswordChangeError } from './password-change.errors';
import { PasswordChangeService } from './password-change.service';

@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly service: PasswordChangeService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
    const response = context.switchToHttp().getResponse<Response>();
    response.setHeader('Cache-Control', 'no-store');
    if (!request.user)
      throw new PasswordChangeError(
        401,
        'UNAUTHENTICATED',
        'Tu sesión no es válida.',
      );
    if (request.headers.origin && request.headers.origin !== getCorsOrigin()) {
      throw new PasswordChangeError(
        403,
        'REQUEST_ORIGIN_NOT_ALLOWED',
        'Origen no permitido.',
      );
    }
    const admission = await this.service.consume(request.user.id);
    if (!admission.allowed) {
      response.setHeader('Retry-After', String(admission.retryAfterSeconds));
      // Safe structured error with timing, never request data.
      throw new PasswordChangeRateLimitError(admission.retryAfterSeconds);
    }
    if (!request.is('application/json')) {
      throw new PasswordChangeError(
        400,
        'INVALID_REQUEST',
        'La solicitud debe contener JSON.',
      );
    }
    return true;
  }
}

export class PasswordChangeRateLimitError extends PasswordChangeError {
  constructor(readonly retryAfterSeconds: number) {
    super(
      429,
      'PASSWORD_CHANGE_RATE_LIMITED',
      'Esperá antes de intentar cambiar la contraseña nuevamente.',
    );
  }
}
