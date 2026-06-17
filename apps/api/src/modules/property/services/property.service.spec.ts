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

import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
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
});
