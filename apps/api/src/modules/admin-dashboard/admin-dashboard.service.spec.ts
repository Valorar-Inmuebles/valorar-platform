import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';

jest.mock('../property-feature-assignment/repositories/property-feature-assignment.repository', () => ({
  PropertyFeatureAssignmentRepository: class PropertyFeatureAssignmentRepository {},
}));

jest.mock('../property-image/repositories/property-image.repository', () => ({
  PropertyImageRepository: class PropertyImageRepository {},
}));

jest.mock('../property-listing/repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

jest.mock('../property-price/repositories/property-price.repository', () => ({
  PropertyPriceRepository: class PropertyPriceRepository {},
}));

jest.mock('../property/repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

import { PropertyFeatureAssignmentRepository } from '../property-feature-assignment/repositories/property-feature-assignment.repository';
import { PropertyImageRepository } from '../property-image/repositories/property-image.repository';
import { PropertyListingRepository } from '../property-listing/repositories/property-listing.repository';
import { PropertyPriceRepository } from '../property-price/repositories/property-price.repository';
import { PropertyRepository } from '../property/repositories/property.repository';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const propertyRepository = {
    findManyWithCreator: jest.fn(),
  };

  const propertyListingRepository = {
    findMany: jest.fn(),
  };

  const propertyImageRepository = {
    getStatsByPropertyIds: jest.fn(),
    findMany: jest.fn(),
  };

  const propertyPriceRepository = {
    getListingIdsWithPrimaryPrice: jest.fn(),
  };

  const propertyFeatureAssignmentRepository = {
    countByPropertyIds: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        { provide: PropertyRepository, useValue: propertyRepository },
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
        { provide: PropertyImageRepository, useValue: propertyImageRepository },
        { provide: PropertyPriceRepository, useValue: propertyPriceRepository },
        {
          provide: PropertyFeatureAssignmentRepository,
          useValue: propertyFeatureAssignmentRepository,
        },
      ],
    }).compile();

    service = module.get(AdminDashboardService);
  });

  it('returns empty dashboard when tenant has no properties', async () => {
    propertyRepository.findManyWithCreator.mockResolvedValue([]);

    const result = await service.getSummary('tenant-1');

    expect(result.kpis.totalProperties).toBe(0);
    expect(result.recentActivity).toEqual([]);
    expect(propertyListingRepository.findMany).not.toHaveBeenCalled();
  });

  it('builds operational dashboard from centralized tenant context', async () => {
    const now = new Date('2026-07-01T12:00:00.000Z');

    propertyRepository.findManyWithCreator.mockResolvedValue([
      {
        id: 'prop-1',
        title: 'Casa Palermo',
        description: 'Descripción suficientemente larga para SEO y publicación web.',
        isActive: true,
        createdAt: new Date('2026-06-30T10:00:00.000Z'),
        updatedAt: now,
        createdBy: { id: 'user-1', name: 'Juan' },
      },
      {
        id: 'prop-2',
        title: 'Depto Caballito',
        description: null,
        isActive: true,
        createdAt: new Date('2026-06-29T10:00:00.000Z'),
        updatedAt: new Date('2026-06-29T10:00:00.000Z'),
        createdBy: { id: 'user-1', name: 'Juan' },
      },
    ]);

    propertyListingRepository.findMany.mockResolvedValue([
      {
        id: 'listing-1',
        propertyId: 'prop-1',
        listingType: 'SALE',
        status: 'ACTIVE',
        publishedAt: new Date('2026-07-01T11:00:00.000Z'),
        createdAt: new Date('2026-06-30T11:00:00.000Z'),
        updatedAt: now,
      },
    ]);

    propertyImageRepository.getStatsByPropertyIds.mockResolvedValue(
      new Map([
        ['prop-1', { imageCount: 2, hasCoverImage: true }],
        ['prop-2', { imageCount: 0, hasCoverImage: false }],
      ]),
    );

    propertyImageRepository.findMany.mockResolvedValue([
      {
        id: 'img-1',
        propertyId: 'prop-1',
        createdAt: new Date('2026-07-01T10:30:00.000Z'),
      },
    ]);

    propertyFeatureAssignmentRepository.countByPropertyIds.mockResolvedValue(
      new Map([
        ['prop-1', 2],
        ['prop-2', 0],
      ]),
    );

    propertyPriceRepository.getListingIdsWithPrimaryPrice.mockResolvedValue(
      new Set(['listing-1']),
    );

    const result = await service.getSummary('tenant-1');

    expect(result.kpis).toEqual({
      totalProperties: 2,
      published: 1,
      drafts: 1,
      archived: 0,
    });
    expect(result.catalogHealth.withoutImages).toBe(1);
    expect(result.filterSets.withoutImages).toEqual(['prop-2']);
    expect(result.recentActivity.length).toBeGreaterThan(0);
    expect(propertyListingRepository.findMany).toHaveBeenCalledTimes(1);
  });
});
