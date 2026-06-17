import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PUBLICATION_CHECKLIST_INCOMPLETE } from '@repo/property-rules';
import { PropertyListingService } from './property-listing.service';

jest.mock('../../../../generated/prisma/client', () => ({
  PropertyListingStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    RESERVED: 'RESERVED',
    CLOSED: 'CLOSED',
  },
}));

jest.mock('../../property-image/repositories/property-image.repository', () => ({
  PropertyImageRepository: class PropertyImageRepository {},
}));

jest.mock('../../property-price/repositories/property-price.repository', () => ({
  PropertyPriceRepository: class PropertyPriceRepository {},
}));

jest.mock('../../property/repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

jest.mock('../repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';
import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { PropertyListingRepository } from '../repositories/property-listing.repository';

describe('PropertyListingService', () => {
  let service: PropertyListingService;

  const propertyListingRepository = {
    findById: jest.fn(),
    update: jest.fn(),
    tenantExists: jest.fn(),
  };

  const propertyRepository = {
    findById: jest.fn(),
  };

  const propertyPriceRepository = {
    hasPrimaryPrice: jest.fn(),
  };

  const propertyImageRepository = {
    countByProperty: jest.fn(),
    hasCoverImage: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyListingService,
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
        { provide: PropertyRepository, useValue: propertyRepository },
        { provide: PropertyPriceRepository, useValue: propertyPriceRepository },
        { provide: PropertyImageRepository, useValue: propertyImageRepository },
      ],
    }).compile();

    service = module.get(PropertyListingService);
  });

  describe('update activation gate', () => {
    const listingId = 'listing-1';
    const propertyId = 'property-1';
    const tenantId = 'tenant-1';

    const draftListing = {
      id: listingId,
      tenantId,
      propertyId,
      listingType: 'SALE',
      status: 'DRAFT',
      publishedAt: null,
      closedAt: null,
    };

    it('activates listing when publication checklist passes', async () => {
      propertyListingRepository.findById.mockResolvedValue(draftListing);
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        isActive: true,
      });
      propertyImageRepository.countByProperty.mockResolvedValue(2);
      propertyImageRepository.hasCoverImage.mockResolvedValue(true);
      propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);
      propertyListingRepository.update.mockResolvedValue({
        ...draftListing,
        status: 'ACTIVE',
        publishedAt: new Date(),
      });

      const result = await service.update(listingId, tenantId, {
        status: 'ACTIVE',
      });

      expect(result.status).toBe('ACTIVE');
      expect(propertyListingRepository.update).toHaveBeenCalled();
    });

    it('fails activation when publication checklist is incomplete', async () => {
      propertyListingRepository.findById.mockResolvedValue(draftListing);
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        isActive: true,
      });
      propertyImageRepository.countByProperty.mockResolvedValue(0);
      propertyImageRepository.hasCoverImage.mockResolvedValue(false);
      propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(false);

      await expect(
        service.update(listingId, tenantId, {
          status: 'ACTIVE',
        }),
      ).rejects.toMatchObject({
        response: {
          code: PUBLICATION_CHECKLIST_INCOMPLETE,
          missing: expect.arrayContaining([
            'has-image',
            'cover-image',
            'primary-price',
          ]),
        },
      });

      expect(propertyListingRepository.update).not.toHaveBeenCalled();
    });

    it('fails activation when property is archived', async () => {
      propertyListingRepository.findById.mockResolvedValue(draftListing);
      propertyRepository.findById.mockResolvedValue({
        id: propertyId,
        isActive: false,
      });
      propertyImageRepository.countByProperty.mockResolvedValue(1);
      propertyImageRepository.hasCoverImage.mockResolvedValue(true);
      propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);

      await expect(
        service.update(listingId, tenantId, {
          status: 'ACTIVE',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(propertyListingRepository.update).not.toHaveBeenCalled();
    });
  });
});
