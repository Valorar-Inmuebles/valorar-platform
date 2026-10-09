jest.mock('../../../../generated/prisma/client', () =>
  jest.requireActual<typeof import('../../../../generated/prisma/enums')>(
    '../../../../generated/prisma/enums',
  ),
);
jest.mock('../../../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PermissionsGuard } from '../../../common/guards/permissions.guard';
import { PropertyAccessService } from '../../property/services/property-access.service';
import { PropertyListingService } from './property-listing.service';
import { PropertyListingController } from '../controllers/property-listing.controller';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantGuard } from '../../auth/guards/tenant.guard';
import type { AuthenticatedRequest } from '../../../common/types/authenticated-request.type';

function harness(
  role: AuthenticatedUser['role'],
  relation: string,
  creatorOnly = false,
) {
  const user = {
    id: 'user',
    role,
    tenantId: role === 'SUPER_ADMIN' ? null : 'tenant',
  } as AuthenticatedUser;
  const property = {
    id: 'property',
    tenantId: 'tenant',
    isActive: true,
    createdById: relation === 'creator' ? user.id : 'other',
    assignedToId: relation === 'assigned' ? user.id : null,
  };
  const listing = {
    id: 'sale',
    propertyId: property.id,
    tenantId: 'tenant',
    listingType: 'SALE',
    status: 'PAUSED',
    publishedAt: null,
    closedAt: null,
  };
  const prisma = {
    tenantSetting: {
      findUnique: jest.fn().mockResolvedValue({
        propertyEditPolicy: creatorOnly
          ? 'CREATOR_ONLY'
          : 'CREATOR_OR_ASSIGNEE',
        propertyVisibilityPolicy: 'AGENT_SEE_ALL',
      }),
    },
    propertyAgentAccess: {
      findUnique: jest
        .fn()
        .mockResolvedValue(
          relation.startsWith('shared')
            ? { canView: true, canEdit: relation === 'shared-edit' }
            : null,
        ),
    },
  };
  const listings = {
    findById: jest
      .fn()
      .mockImplementation((id, tenant) =>
        Promise.resolve(
          id === listing.id && tenant === 'tenant' ? listing : null,
        ),
      ),
    findByPropertyAndListingType: jest.fn().mockResolvedValue(null),
    tenantExists: jest.fn().mockResolvedValue(true),
    create: jest.fn().mockResolvedValue(listing),
    update: jest
      .fn()
      .mockImplementation((_id, _tenant, data) =>
        Promise.resolve({ ...listing, ...data }),
      ),
    softClose: jest.fn().mockResolvedValue({ ...listing, status: 'CLOSED' }),
  };
  const properties = {
    findById: jest
      .fn()
      .mockImplementation((id, tenant) =>
        Promise.resolve(
          id === property.id && tenant === 'tenant' ? property : null,
        ),
      ),
  };
  const prices = { hasPrimaryPrice: jest.fn().mockResolvedValue(true) };
  const images = {
    countByProperty: jest.fn().mockResolvedValue(1),
    hasCoverImage: jest.fn().mockResolvedValue(true),
  };
  const access = new PropertyAccessService(prisma as never);
  const service = new PropertyListingService(
    listings as never,
    properties as never,
    prices as never,
    images as never,
    access,
  );
  return {
    user,
    property,
    listing,
    listings,
    properties,
    prices,
    images,
    service,
  };
}

describe('Listing mutations use parent property authorization', () => {
  it('requires JWT, effective tenant and permissions, including explicit SUPER_ADMIN tenant', async () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, PropertyListingController),
    ).toEqual([JwtAuthGuard, TenantGuard, PermissionsGuard]);
    const request = {
      user: harness('SUPER_ADMIN', 'unrelated').user,
      headers: {},
    } as AuthenticatedRequest;
    const context = {
      getClass: () => PropertyListingController,
      // eslint-disable-next-line @typescript-eslint/unbound-method
      getHandler: () => PropertyListingController.prototype.update,
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    const guard = new TenantGuard(new Reflector(), {
      findTenantById: jest
        .fn()
        .mockResolvedValue({ id: 'tenant', status: 'ACTIVE' }),
    } as never);
    await expect(guard.canActivate(context)).rejects.toThrow();
    request.headers['x-tenant-id'] = 'tenant';
    expect(await guard.canActivate(context)).toBe(true);
    expect(request.tenantId).toBe('tenant');
    Reflect.deleteProperty(request, 'user');
    expect(await guard.canActivate(context)).toBe(false);
  });
  const cases: [AuthenticatedUser['role'], string, boolean, boolean][] = [
    ['AGENT', 'creator', false, true],
    ['AGENT', 'assigned', false, true],
    ['AGENT', 'assigned', true, false],
    ['AGENT', 'creator', true, true],
    ['AGENT', 'shared-edit', true, true],
    ['AGENT', 'shared-view', false, false],
    ['AGENT', 'unrelated', false, false],
    ['MANAGER', 'unrelated', true, true],
    ['TENANT_ADMIN', 'unrelated', true, true],
    ['COLLABORATOR', 'creator', false, false],
    ['COLLABORATOR', 'shared-edit', false, false],
    ['SUPER_ADMIN', 'unrelated', true, true],
  ];
  describe.each(['create', 'update', 'remove'] as const)('%s', (operation) => {
    it.each(cases)(
      '%s %s creatorOnly=%s allowed=%s',
      async (role, relation, policy, allowed) => {
        const h = harness(role, relation, policy);
        const promise =
          operation === 'create'
            ? h.service.create(
                { propertyId: 'property', listingType: 'SALE' },
                'tenant',
                h.user,
              )
            : operation === 'update'
              ? h.service.update('sale', 'tenant', { status: 'ACTIVE' }, h.user)
              : h.service.remove('sale', 'tenant', h.user);
        if (allowed) await expect(promise).resolves.toBeDefined();
        else {
          await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
          expect(h.listings.create).not.toHaveBeenCalled();
          expect(h.listings.update).not.toHaveBeenCalled();
          expect(h.listings.softClose).not.toHaveBeenCalled();
        }
        expect(h.properties.findById).toHaveBeenCalledWith(
          'property',
          'tenant',
        );
      },
    );
  });

  it.each(['AGENT', 'SUPER_ADMIN'] as const)(
    'rejects cross-effective-tenant operations for %s',
    async (role) => {
      const h = harness(role, 'creator');
      await expect(
        h.service.create(
          { propertyId: 'property', listingType: 'SALE' },
          'other',
          h.user,
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        h.service.update('sale', 'other', { status: 'ACTIVE' }, h.user),
      ).rejects.toBeInstanceOf(NotFoundException);
      await expect(
        h.service.remove('sale', 'other', h.user),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(h.listings.update).not.toHaveBeenCalled();
    },
  );

  it('checks authorization even for idempotent close and empty update', async () => {
    const h = harness('AGENT', 'unrelated');
    h.listing.status = 'CLOSED';
    await expect(
      h.service.remove('sale', 'tenant', h.user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      h.service.update('sale', 'tenant', {}, h.user),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['create', 'update', 'remove'] as const)(
    'enforces permission metadata on %s',
    (operation) => {
      const guard = new PermissionsGuard(new Reflector());
      for (const role of [
        'COLLABORATOR',
        'AGENT',
        'MANAGER',
        'TENANT_ADMIN',
        'SUPER_ADMIN',
      ] as const) {
        const context = {
          getHandler: () => PropertyListingController.prototype[operation],
          getClass: () => PropertyListingController,
          switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
        } as unknown as ExecutionContext;
        if (role === 'COLLABORATOR')
          expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
        else expect(guard.canActivate(context)).toBe(true);
      }
    },
  );

  it.each(['DRAFT', 'PAUSED', 'RESERVED', 'CLOSED'])(
    'activates %s with its own primary price only',
    async (status) => {
      const h = harness('AGENT', 'creator');
      h.listing.status = status;
      await h.service.update('sale', 'tenant', { status: 'ACTIVE' }, h.user);
      expect(h.prices.hasPrimaryPrice).toHaveBeenCalledWith('sale', 'tenant');
      expect(h.listings.update).toHaveBeenCalledTimes(1);
      expect(h.listings.update).toHaveBeenCalledWith(
        'sale',
        'tenant',
        expect.objectContaining({ status: 'ACTIVE' }),
      );
      h.prices.hasPrimaryPrice.mockResolvedValue(false);
      await expect(
        h.service.update('sale', 'tenant', { status: 'ACTIVE' }, h.user),
      ).rejects.toMatchObject({ response: { missing: ['primary-price'] } });
      expect(h.listings.update).toHaveBeenCalledTimes(1);
    },
  );

  it('pauses only the selected ACTIVE operation without activation prerequisites', async () => {
    const h = harness('AGENT', 'creator');
    h.listing.status = 'ACTIVE';
    await h.service.update('sale', 'tenant', { status: 'PAUSED' }, h.user);
    expect(h.listings.update).toHaveBeenCalledWith('sale', 'tenant', {
      status: 'PAUSED',
    });
    expect(h.prices.hasPrimaryPrice).not.toHaveBeenCalled();
  });
});
