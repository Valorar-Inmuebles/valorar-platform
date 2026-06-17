import { Test, TestingModule } from '@nestjs/testing';
import { AdminDashboardService } from './admin-dashboard.service';

jest.mock('../property/services/property-publishability.service', () => ({
  PropertyPublishabilityService: class PropertyPublishabilityService {},
}));

jest.mock('../property/repositories/property.repository', () => ({
  PropertyRepository: class PropertyRepository {},
}));

jest.mock('../property-listing/repositories/property-listing.repository', () => ({
  PropertyListingRepository: class PropertyListingRepository {},
}));

import { PropertyPublishabilityService } from '../property/services/property-publishability.service';
import { PropertyListingRepository } from '../property-listing/repositories/property-listing.repository';
import { PropertyRepository } from '../property/repositories/property.repository';

describe('AdminDashboardService', () => {
  let service: AdminDashboardService;

  const propertyPublishabilityService = {
    getPublicationDashboardMetrics: jest.fn(),
  };

  const propertyRepository = {
    count: jest.fn(),
  };

  const propertyListingRepository = {
    countActiveDashboardMetrics: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminDashboardService,
        {
          provide: PropertyPublishabilityService,
          useValue: propertyPublishabilityService,
        },
        { provide: PropertyRepository, useValue: propertyRepository },
        {
          provide: PropertyListingRepository,
          useValue: propertyListingRepository,
        },
      ],
    }).compile();

    service = module.get(AdminDashboardService);
  });

  it('combines publication metrics, listing counts and active properties', async () => {
    propertyPublishabilityService.getPublicationDashboardMetrics.mockResolvedValue(
      {
        publishedProperties: 5,
        publishAlerts: {
          withoutCover: 2,
          draftListingsWithPrice: 1,
          activePropertiesWithoutActiveListing: 3,
        },
      },
    );
    propertyListingRepository.countActiveDashboardMetrics.mockResolvedValue({
      sale: 4,
      rent: 2,
      featured: 1,
    });
    propertyRepository.count.mockResolvedValue(10);

    const result = await service.getSummary('tenant-1');

    expect(result).toEqual({
      kpis: {
        totalActiveProperties: 10,
        publishedProperties: 5,
        activeSaleListings: 4,
        activeRentListings: 2,
        featuredListings: 1,
      },
      publishAlerts: {
        withoutCover: 2,
        draftListingsWithPrice: 1,
        activePropertiesWithoutActiveListing: 3,
      },
    });
  });
});
