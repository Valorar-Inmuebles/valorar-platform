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
    buildListWhere = jest.fn(async (_tenantId, _user, base) => base ?? {});
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

  describe('findAll createdBy projection', () => {
    it('maps list results through fromEntity including createdBy', async () => {
      propertyRepository.findMany.mockResolvedValue([
        {
          id: 'property-1',
          tenantId: 'tenant-1',
          createdById: 'admin-1',
          assignedToId: null,
          slug: 'casa',
          internalCode: null,
          title: 'Casa',
          description: null,
          propertyType: 'HOUSE',
          condition: null,
          isActive: true,
          street: null,
          streetNumber: null,
          floor: null,
          apartment: null,
          neighborhood: null,
          city: 'CABA',
          province: null,
          country: 'AR',
          countryId: null,
          provinceId: null,
          localityId: null,
          neighborhoodId: null,
          postalCode: null,
          latitude: null,
          longitude: null,
          googlePlaceId: null,
          formattedAddress: null,
          geocodeSource: null,
          geocodeAccuracy: null,
          totalArea: null,
          coveredArea: null,
          uncoveredArea: null,
          lotFront: null,
          lotDepth: null,
          rooms: null,
          bedrooms: null,
          bathrooms: null,
          halfBathrooms: null,
          parkingSpaces: null,
          yearBuilt: null,
          orientation: null,
          layout: null,
          brightness: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: {
            id: 'admin-1',
            name: 'Admin Test',
            email: 'admin@test.dev',
            isActive: true,
          },
        },
      ]);

      const result = await service.findAll('tenant-1', adminUser);

      expect(propertyRepository.findMany).toHaveBeenCalledTimes(1);
      expect(result[0].createdBy).toEqual({
        id: 'admin-1',
        name: 'Admin Test',
        email: 'admin@test.dev',
        isActive: true,
      });
      expect(result[0].createdById).toBe('admin-1');
    });
  });
});
