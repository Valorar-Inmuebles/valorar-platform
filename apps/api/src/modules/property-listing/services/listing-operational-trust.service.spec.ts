import { Test, TestingModule } from '@nestjs/testing';
import { ListingOperationalTrustService } from './listing-operational-trust.service';

jest.mock('../../../../generated/prisma/client', () => ({
  PropertyListingStatus: {
    DRAFT: 'DRAFT',
    ACTIVE: 'ACTIVE',
    PAUSED: 'PAUSED',
    RESERVED: 'RESERVED',
    CLOSED: 'CLOSED',
  },
}));

jest.mock('../repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

jest.mock('../../property/repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

jest.mock('../../property-image/repositories/property-image.repository', () => ({
  PropertyImageRepository: class PropertyImageRepository {},
}));

jest.mock('../../property-price/repositories/property-price.repository', () => ({
  PropertyPriceRepository: class PropertyPriceRepository {},
}));

import { PropertyListingRepository } from '../repositories/property-listing.repository';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';
import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';

describe('ListingOperationalTrustService', () => {
  let service: ListingOperationalTrustService;

  const propertyListingRepository = {
    findMany: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  };

  const propertyRepository = {
    findById: jest.fn(),
  };

  const propertyImageRepository = {
    countByProperty: jest.fn(),
    hasCoverImage: jest.fn(),
  };

  const propertyPriceRepository = {
    hasPrimaryPrice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ListingOperationalTrustService,
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
        { provide: PropertyRepository, useValue: propertyRepository },
        {
          provide: PropertyImageRepository,
          useValue: propertyImageRepository,
        },
        {
          provide: PropertyPriceRepository,
          useValue: propertyPriceRepository,
        },
      ],
    }).compile();

    service = module.get(ListingOperationalTrustService);
  });

  it('pauses ACTIVE listings when cover image is missing', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findMany.mockResolvedValue([
      { id: 'listing-1', propertyId: 'property-1', status: 'ACTIVE' },
    ]);
    propertyImageRepository.countByProperty.mockResolvedValue(2);
    propertyImageRepository.hasCoverImage.mockResolvedValue(false);
    propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);
    propertyListingRepository.update.mockResolvedValue({});

    const pausedIds = await service.syncActiveListingsAfterDegradation(
      'property-1',
      'tenant-1',
    );

    expect(pausedIds).toEqual(['listing-1']);
    expect(propertyListingRepository.update).toHaveBeenCalledWith(
      'listing-1',
      'tenant-1',
      { status: 'PAUSED' },
    );
  });

  it('pauses ACTIVE listings when property is archived', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: false,
    });
    propertyListingRepository.findMany.mockResolvedValue([
      { id: 'listing-1', propertyId: 'property-1', status: 'ACTIVE' },
    ]);
    propertyImageRepository.countByProperty.mockResolvedValue(3);
    propertyImageRepository.hasCoverImage.mockResolvedValue(true);
    propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);
    propertyListingRepository.update.mockResolvedValue({});

    const pausedIds = await service.syncActiveListingsAfterDegradation(
      'property-1',
      'tenant-1',
    );

    expect(pausedIds).toEqual(['listing-1']);
  });

  it('does not pause publishable ACTIVE listings', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findMany.mockResolvedValue([
      { id: 'listing-1', propertyId: 'property-1', status: 'ACTIVE' },
    ]);
    propertyImageRepository.countByProperty.mockResolvedValue(2);
    propertyImageRepository.hasCoverImage.mockResolvedValue(true);
    propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);

    const pausedIds = await service.syncActiveListingsAfterDegradation(
      'property-1',
      'tenant-1',
    );

    expect(pausedIds).toEqual([]);
    expect(propertyListingRepository.update).not.toHaveBeenCalled();
  });

  it('syncActiveListingsForListing resolves property from listing id', async () => {
    propertyListingRepository.findById.mockResolvedValue({
      id: 'listing-1',
      propertyId: 'property-1',
    });
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findMany.mockResolvedValue([]);

    await service.syncActiveListingsForListing('listing-1', 'tenant-1');

    expect(propertyListingRepository.findMany).toHaveBeenCalledWith('tenant-1', {
      propertyId: 'property-1',
      status: 'ACTIVE',
    });
  });
});
