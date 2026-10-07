jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import {
  BadRequestException,
  ForbiddenException,
  type ExecutionContext,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { PropertyDetailContextController } from './property-detail-context.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';
import type { UserRole } from '../../../../generated/prisma/client';

describe('Property detail context guard contract', () => {
  function setup(role: UserRole = 'AGENT', header?: string) {
    const request = {
      user: {
        id: 'user-1',
        tenantId: role === 'SUPER_ADMIN' ? null : 'tenant-1',
        role,
      },
      headers: header ? { 'x-tenant-id': header } : {},
    } as AuthenticatedRequest;
    const context = {
      getClass: () => PropertyDetailContextController,
      // Metadata lookup needs the original method identity, without invocation.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      getHandler: () => PropertyDetailContextController.prototype.findOne,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const auth = {
      findTenantById: jest.fn((id: string) =>
        Promise.resolve({ id, status: 'ACTIVE' }),
      ),
    };
    const tenant = new TenantGuard(new Reflector(), auth as never);
    const permissions = new PermissionsGuard(new Reflector());
    return { request, context, auth, tenant, permissions };
  }

  it('requires JWT, tenant and permissions guards in that order', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PropertyDetailContextController),
    ).toEqual([JwtAuthGuard, TenantGuard, PermissionsGuard]);
  });

  it('rejects missing authentication before data access', async () => {
    const { request, context, tenant, permissions, auth } = setup();
    Reflect.deleteProperty(request, 'user');
    expect(await tenant.canActivate(context)).toBe(false);
    expect(permissions.canActivate(context)).toBe(false);
    expect(auth.findTenantById).not.toHaveBeenCalled();
  });

  it('ignores a foreign tenant header for a tenant user', async () => {
    const { request, context, tenant, permissions, auth } = setup(
      'AGENT',
      'tenant-2',
    );
    expect(await tenant.canActivate(context)).toBe(true);
    expect(request.tenantId).toBe('tenant-1');
    expect(auth.findTenantById).toHaveBeenCalledWith('tenant-1');
    expect(permissions.canActivate(context)).toBe(true);
  });

  it('requires explicit tenant selection for SUPER_ADMIN', async () => {
    const { context, tenant } = setup('SUPER_ADMIN');
    await expect(tenant.canActivate(context)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    const selected = setup('SUPER_ADMIN', 'tenant-2');
    expect(await selected.tenant.canActivate(selected.context)).toBe(true);
    expect(selected.request.tenantId).toBe('tenant-2');
    expect(selected.permissions.canActivate(selected.context)).toBe(true);
  });

  it('rejects suspended tenants', async () => {
    const { context, tenant, auth } = setup();
    auth.findTenantById.mockResolvedValue({
      id: 'tenant-1',
      status: 'SUSPENDED',
    });
    await expect(tenant.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('enforces property.read, including deny for roles without it', () => {
    const { context, permissions } = setup('UNAUTHORIZED' as UserRole);
    expect(() => permissions.canActivate(context)).toThrow(ForbiddenException);
  });
});
