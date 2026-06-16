import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../../../generated/prisma/client';
import { ROLES_KEY } from '../../../common/decorators/roles.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import { FORBIDDEN_ROLE_MESSAGE } from '../constants/auth.constants';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<
      UserRole[] | undefined
    >(ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException(FORBIDDEN_ROLE_MESSAGE);
    }

    return true;
  }
}
