jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class {},
}));
import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PropertyController } from './property.controller';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { UpdatePropertyDto } from '../dto/update-property.dto';

describe('Property PATCH boundary contract', () => {
  it('retains JWT, tenant, and RBAC guards in order', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PropertyController)).toEqual([
      JwtAuthGuard,
      TenantGuard,
      PermissionsGuard,
    ]);
  });

  it.each(['AGENT', 'MANAGER', 'TENANT_ADMIN', 'SUPER_ADMIN', 'COLLABORATOR'])(
    'enforces update permissions for %s',
    (role) => {
      const context = {
        getClass: () => PropertyController,
        // eslint-disable-next-line @typescript-eslint/unbound-method
        getHandler: () => PropertyController.prototype.update,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      } as unknown as ExecutionContext;
      const guard = new PermissionsGuard(new Reflector());
      if (role === 'COLLABORATOR')
        expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      else expect(guard.canActivate(context)).toBe(true);
    },
  );

  it.each([
    { title: 'Nuevo' },
    { description: '' },
    { description: null, internalCode: null, condition: null, totalArea: null },
    {},
  ])('accepts the existing partial/nullable DTO contract: %j', async (body) => {
    expect(
      await validate(plainToInstance(UpdatePropertyDto, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).toEqual([]);
  });

  it.each([
    { tenantId: 'foreign' },
    { createdById: 'foreign' },
    { title: '' },
    { slug: 'INVALID' },
    { assignedToId: 1 },
  ])('rejects invalid or untrusted input: %j', async (body) => {
    expect(
      await validate(plainToInstance(UpdatePropertyDto, body), {
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    ).not.toEqual([]);
  });
});
