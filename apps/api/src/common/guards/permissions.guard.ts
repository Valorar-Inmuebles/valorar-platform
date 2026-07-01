import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAllPermissions, hasAnyPermission, type Permission, type PlatformRole } from '@repo/rbac';
import { PERMISSIONS_KEY, PERMISSIONS_MODE_KEY, type PermissionsMode } from '../decorators/require-permissions.decorator';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import { FORBIDDEN_ROLE_MESSAGE } from '../../modules/auth/constants/auth.constants';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<
      Permission[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    const mode = this.reflector.getAllAndOverride<PermissionsMode | undefined>(
      PERMISSIONS_MODE_KEY,
      [context.getHandler(), context.getClass()],
    ) ?? 'all';

    const role = user.role as PlatformRole;

    const allowed =
      mode === 'any'
        ? hasAnyPermission(role, requiredPermissions)
        : hasAllPermissions(role, requiredPermissions);

    if (!allowed) {
      throw new ForbiddenException(FORBIDDEN_ROLE_MESSAGE);
    }

    return true;
  }
}
