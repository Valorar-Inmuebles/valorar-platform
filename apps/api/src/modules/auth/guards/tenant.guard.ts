import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, TenantStatus } from '../../../../generated/prisma/client';
import { REQUIRE_TENANT_KEY } from '../../../common/decorators/require-tenant.decorator';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import {
  TENANT_NOT_FOUND_MESSAGE,
  TENANT_REQUIRED_MESSAGE,
  TENANT_SUSPENDED_MESSAGE,
  USER_TENANT_MISSING_MESSAGE,
} from '../constants/auth.constants';
import { AuthRepository } from '../repositories/auth.repository';

const X_TENANT_ID_HEADER = 'x-tenant-id';

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authRepository: AuthRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requireTenant = this.reflector.getAllAndOverride<boolean>(
      REQUIRE_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requireTenant) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return false;
    }

    request.tenantId = await this.resolveTenantId(request, user);
    return true;
  }

  private async resolveTenantId(
    request: AuthenticatedRequest,
    user: AuthenticatedUser,
  ): Promise<string> {
    if (user.role === UserRole.SUPER_ADMIN) {
      const headerValue = request.headers[X_TENANT_ID_HEADER];
      const rawTenantId = Array.isArray(headerValue)
        ? headerValue[0]
        : headerValue;

      if (typeof rawTenantId !== 'string' || rawTenantId.trim().length === 0) {
        throw new BadRequestException(TENANT_REQUIRED_MESSAGE);
      }

      const tenantId = rawTenantId.trim();
      const tenant = await this.authRepository.findTenantById(tenantId);

      if (!tenant) {
        throw new BadRequestException(TENANT_NOT_FOUND_MESSAGE);
      }

      if (tenant.status !== TenantStatus.ACTIVE) {
        throw new ForbiddenException(TENANT_SUSPENDED_MESSAGE);
      }

      return tenantId;
    }

    if (!user.tenantId) {
      throw new ForbiddenException(USER_TENANT_MISSING_MESSAGE);
    }

    const tenant = await this.authRepository.findTenantById(user.tenantId);

    if (!tenant) {
      throw new BadRequestException(TENANT_NOT_FOUND_MESSAGE);
    }

    if (tenant.status !== TenantStatus.ACTIVE) {
      throw new ForbiddenException(TENANT_SUSPENDED_MESSAGE);
    }

    return user.tenantId;
  }
}
