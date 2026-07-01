import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PropertyService } from './property.service';

jest.mock('../../../../generated/prisma/client', () => ({
  PropertyListingStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    RESERVED: 'RESERVED',
    CLOSED: 'CLOSED',
  },
}));

jest.mock('../../property-listing/repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

jest.mock('../repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

jest.mock('../../property-listing/services/listing-operational-trust.service', () => ({
  ListingOperationalTrustService: class ListingOperationalTrustService {},
}));

jest.mock('./property-geo.service', () => ({
  PropertyGeoService: class PropertyGeoService {},
}));

jest.mock('./property-access.service', () => ({
  PropertyAccessService: class PropertyAccessService {
    assertCanEditProperty = jest.fn().mockResolvedValue(undefined);
    assertCanViewProperty = jest.fn().mockResolvedValue(undefined);
    buildListWhere = jest.fn((_tenantId, _user, base) => base ?? {});
  },
}));

import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { ListingOperationalTrustService } from '../../property-listing/services/listing-operational-trust.service';
import { PropertyRepository } from '../repositories/property.repository';
import { PropertyGeoService } from './property-geo.service';
import { PropertyAccessService } from './property-access.service';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';

const adminUser: AuthenticatedUser = {
  id: 'admin-1',
  email: 'admin@test.dev',
  name: 'Admin Test',
  role: 'TENANT_ADMIN',
  tenantId: 'tenant-1',
};

describe('PropertyService', () => {
  let service: PropertyService;

  const propertyRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    tenantExists: jest.fn(),
    findBySlug: jest.fn(),
    findByInternalCode: jest.fn(),
    userBelongsToTenant: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    softArchive: jest.fn(),
  };

  const propertyListingRepository = {
    hasActiveListingForProperty: jest.fn(),
  };

  const listingOperationalTrustService = {
    syncActiveListingsAfterDegradation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyService,
        { provide: PropertyRepository, useValue: propertyRepository },
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
        {
          provide: ListingOperationalTrustService,
          useValue: listingOperationalTrustService,
        },
        { provide: PropertyGeoService, useValue: {} },
        {
          provide: PropertyAccessService,
          useValue: {
            assertCanEditProperty: jest.fn().mockResolvedValue(undefined),
            assertCanViewProperty: jest.fn().mockResolvedValue(undefined),
            buildListWhere: jest.fn((_tenantId, _user, base) => base ?? {}),
          },
        },
      ],
    }).compile();

    service = module.get(PropertyService);
  });

  describe('update slug lock', () => {
    const propertyId = 'property-1';
    const tenantId = 'tenant-1';

    it('blocks slug change when an active listing exists', async () => {
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        slug: 'casa-centro',
        tenantId,
        createdById: adminUser.id,
        assignedToId: null,
      });
      propertyListingRepository.hasActiveListingForProperty.mockResolvedValue(
        true,
      );

      await expect(
        service.update(propertyId, tenantId, { slug: 'casa-nueva' }, adminUser),
      ).rejects.toThrow(BadRequestException);

      expect(propertyRepository.update).not.toHaveBeenCalled();
    });

    it('allows slug change when no active listing exists', async () => {
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        slug: 'casa-centro',
        tenantId,
        createdById: adminUser.id,
        assignedToId: null,
      });
      propertyListingRepository.hasActiveListingForProperty.mockResolvedValue(
        false,
      );
      propertyRepository.findBySlug.mockResolvedValue(null);
      propertyRepository.update.mockResolvedValue({
        id: propertyId,
        slug: 'casa-nueva',
      });

      const result = await service.update(
        propertyId,
        tenantId,
        { slug: 'casa-nueva' },
        adminUser,
      );

      expect(result.slug).toBe('casa-nueva');
      expect(propertyRepository.update).toHaveBeenCalled();
    });
  });

  describe('operational trust on archive', () => {
    const propertyId = 'property-1';
    const tenantId = 'tenant-1';

    it('syncs listings when property is archived via update', async () => {
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        tenantId,
        createdById: adminUser.id,
        assignedToId: null,
      });
      propertyRepository.update.mockResolvedValue({
        id: propertyId,
        isActive: false,
      });

      await service.update(propertyId, tenantId, { isActive: false }, adminUser);

      expect(
        listingOperationalTrustService.syncActiveListingsAfterDegradation,
      ).toHaveBeenCalledWith(propertyId, tenantId);
    });

    it('syncs listings when property is soft archived', async () => {
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        tenantId,
        createdById: adminUser.id,
        assignedToId: null,
      });
      propertyRepository.softArchive.mockResolvedValue({
        id: propertyId,
        isActive: false,
      });

      await service.remove(propertyId, tenantId, adminUser);

      expect(
        listingOperationalTrustService.syncActiveListingsAfterDegradation,
      ).toHaveBeenCalledWith(propertyId, tenantId);
    });
  });
});
