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

import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { ListingOperationalTrustService } from '../../property-listing/services/listing-operational-trust.service';
import { PropertyRepository } from '../repositories/property.repository';

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
      });
      propertyListingRepository.hasActiveListingForProperty.mockResolvedValue(
        true,
      );

      await expect(
        service.update(propertyId, tenantId, { slug: 'casa-nueva' }),
      ).rejects.toThrow(BadRequestException);

      expect(propertyRepository.update).not.toHaveBeenCalled();
    });

    it('allows slug change when no active listing exists', async () => {
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        slug: 'casa-centro',
      });
      propertyListingRepository.hasActiveListingForProperty.mockResolvedValue(
        false,
      );
      propertyRepository.findBySlug.mockResolvedValue(null);
      propertyRepository.update.mockResolvedValue({
        id: propertyId,
        slug: 'casa-nueva',
      });

      const result = await service.update(propertyId, tenantId, {
        slug: 'casa-nueva',
      });

      expect(result.slug).toBe('casa-nueva');
      expect(propertyRepository.update).toHaveBeenCalled();
    });
  });

  describe('operational trust on archive', () => {
    const propertyId = 'property-1';
    const tenantId = 'tenant-1';

    it('syncs listings when property is archived via update', async () => {
      propertyRepository.update.mockResolvedValue({
        id: propertyId,
        isActive: false,
      });

      await service.update(propertyId, tenantId, { isActive: false });

      expect(
        listingOperationalTrustService.syncActiveListingsAfterDegradation,
      ).toHaveBeenCalledWith(propertyId, tenantId);
    });

    it('syncs listings when property is soft archived', async () => {
      propertyRepository.softArchive.mockResolvedValue({
        id: propertyId,
        isActive: false,
      });

      await service.remove(propertyId, tenantId);

      expect(
        listingOperationalTrustService.syncActiveListingsAfterDegradation,
      ).toHaveBeenCalledWith(propertyId, tenantId);
    });
  });
});
