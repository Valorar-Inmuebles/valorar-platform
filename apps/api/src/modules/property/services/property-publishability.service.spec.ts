import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PropertyPublishabilityService } from './property-publishability.service';

jest.mock('../../property-image/repositories/property-image.repository', () => ({
  PropertyImageRepository: class PropertyImageRepository {},
}));

jest.mock('../../property-listing/repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

jest.mock('../../property-price/repositories/property-price.repository', () => ({
  PropertyPriceRepository: class PropertyPriceRepository {},
}));

jest.mock('../repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';
import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';
import { PropertyRepository } from '../repositories/property.repository';

describe('PropertyPublishabilityService', () => {
  let service: PropertyPublishabilityService;

  const propertyRepository = {
    findById: jest.fn(),
    findMany: jest.fn(),
  };

  const propertyListingRepository = {
    findById: jest.fn(),
    findMany: jest.fn(),
  };

  const propertyImageRepository = {
    countByProperty: jest.fn(),
    hasCoverImage: jest.fn(),
    getStatsByPropertyIds: jest.fn(),
  };

  const propertyPriceRepository = {
    hasPrimaryPrice: jest.fn(),
    getListingIdsWithPrimaryPrice: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PropertyPublishabilityService,
        { provide: PropertyRepository, useValue: propertyRepository },
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
        { provide: PropertyImageRepository, useValue: propertyImageRepository },
        { provide: PropertyPriceRepository, useValue: propertyPriceRepository },
      ],
    }).compile();

    service = module.get(PropertyPublishabilityService);
  });

  it('returns publishable checklist when all visibility checks pass', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findById.mockResolvedValue({
      id: 'listing-1',
      propertyId: 'property-1',
      status: 'ACTIVE',
    });
    propertyImageRepository.countByProperty.mockResolvedValue(2);
    propertyImageRepository.hasCoverImage.mockResolvedValue(true);
    propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(true);

    const result = await service.evaluate(
      'property-1',
      'listing-1',
      'tenant-1',
    );

    expect(result.isPublishable).toBe(true);
    expect(result.progress).toBe(100);
    expect(result.missing).toEqual([]);
  });

  it('returns missing checks when listing is not publishable', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findById.mockResolvedValue({
      id: 'listing-1',
      propertyId: 'property-1',
      status: 'DRAFT',
    });
    propertyImageRepository.countByProperty.mockResolvedValue(0);
    propertyImageRepository.hasCoverImage.mockResolvedValue(false);
    propertyPriceRepository.hasPrimaryPrice.mockResolvedValue(false);

    const result = await service.evaluate(
      'property-1',
      'listing-1',
      'tenant-1',
    );

    expect(result.isPublishable).toBe(false);
    expect(result.missing).toEqual(
      expect.arrayContaining([
        'has-image',
        'cover-image',
        'listing-active',
        'primary-price',
      ]),
    );
  });

  it('throws when listing does not belong to property', async () => {
    propertyRepository.findById.mockResolvedValue({
      id: 'property-1',
      isActive: true,
    });
    propertyListingRepository.findById.mockResolvedValue({
      id: 'listing-1',
      propertyId: 'other-property',
      status: 'DRAFT',
    });

    await expect(
      service.evaluate('property-1', 'listing-1', 'tenant-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  describe('summarizeForTenant', () => {
    it('returns archived status for inactive properties', async () => {
      propertyRepository.findMany.mockResolvedValue([
        {
          id: 'property-1',
          slug: 'depto-centro',
          isActive: false,
        },
      ]);
      propertyListingRepository.findMany.mockResolvedValue([]);
      propertyImageRepository.getStatsByPropertyIds.mockResolvedValue(
        new Map([['property-1', { imageCount: 0, hasCoverImage: false }]]),
      );
      propertyPriceRepository.getListingIdsWithPrimaryPrice.mockResolvedValue(
        new Set(),
      );

      const result = await service.summarizeForTenant('tenant-1');

      expect(result).toEqual([
        {
          propertyId: 'property-1',
          statusVariant: 'archived',
          isAnyPublishable: false,
          publicUrl: null,
        },
      ]);
    });

    it('returns published status when a listing is publishable', async () => {
      propertyRepository.findMany.mockResolvedValue([
        {
          id: 'property-1',
          slug: 'depto-centro',
          isActive: true,
        },
      ]);
      propertyListingRepository.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          propertyId: 'property-1',
          listingType: 'SALE',
          status: 'ACTIVE',
        },
      ]);
      propertyImageRepository.getStatsByPropertyIds.mockResolvedValue(
        new Map([['property-1', { imageCount: 2, hasCoverImage: true }]]),
      );
      propertyPriceRepository.getListingIdsWithPrimaryPrice.mockResolvedValue(
        new Set(['listing-1']),
      );

      const result = await service.summarizeForTenant('tenant-1');

      expect(result[0]?.statusVariant).toBe('published');
      expect(result[0]?.isAnyPublishable).toBe(true);
    });

    it('returns commercial-draft when active but not publishable', async () => {
      propertyRepository.findMany.mockResolvedValue([
        {
          id: 'property-1',
          slug: 'depto-centro',
          isActive: true,
        },
      ]);
      propertyListingRepository.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          propertyId: 'property-1',
          listingType: 'SALE',
          status: 'DRAFT',
        },
      ]);
      propertyImageRepository.getStatsByPropertyIds.mockResolvedValue(
        new Map([['property-1', { imageCount: 0, hasCoverImage: false }]]),
      );
      propertyPriceRepository.getListingIdsWithPrimaryPrice.mockResolvedValue(
        new Set(),
      );

      const result = await service.summarizeForTenant('tenant-1');

      expect(result[0]?.statusVariant).toBe('commercial-draft');
      expect(result[0]?.isAnyPublishable).toBe(false);
      expect(result[0]?.publicUrl).toBeNull();
    });
  });

  describe('getPublicationDashboardMetrics', () => {
    it('returns aggregated publication metrics from shared tenant context', async () => {
      propertyRepository.findMany.mockResolvedValue([
        {
          id: 'property-1',
          slug: 'published',
          isActive: true,
        },
        {
          id: 'property-2',
          slug: 'draft',
          isActive: true,
        },
      ]);
      propertyListingRepository.findMany.mockResolvedValue([
        {
          id: 'listing-1',
          propertyId: 'property-1',
          listingType: 'SALE',
          status: 'ACTIVE',
        },
        {
          id: 'listing-2',
          propertyId: 'property-2',
          listingType: 'RENT',
          status: 'DRAFT',
        },
      ]);
      propertyImageRepository.getStatsByPropertyIds.mockResolvedValue(
        new Map([
          ['property-1', { imageCount: 2, hasCoverImage: true }],
          ['property-2', { imageCount: 1, hasCoverImage: false }],
        ]),
      );
      propertyPriceRepository.getListingIdsWithPrimaryPrice.mockResolvedValue(
        new Set(['listing-1', 'listing-2']),
      );

      const result = await service.getPublicationDashboardMetrics('tenant-1');

      expect(result.publishedProperties).toBe(1);
      expect(result.publishAlerts).toEqual({
        withoutCover: 1,
        draftListingsWithPrice: 1,
        activePropertiesWithoutActiveListing: 1,
      });
    });
  });
});
