import { Injectable } from '@nestjs/common';
import { PropertyListingRepository } from '../property-listing/repositories/property-listing.repository';
import { PropertyPublishabilityService } from '../property/services/property-publishability.service';
import { PropertyRepository } from '../property/repositories/property.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly propertyPublishabilityService: PropertyPublishabilityService,
    private readonly propertyRepository: PropertyRepository,
    private readonly propertyListingRepository: PropertyListingRepository,
  ) {}

  async getSummary(tenantId: string): Promise<DashboardSummaryResponseDto> {
    const [publicationMetrics, listingCounts, totalActiveProperties] =
      await Promise.all([
        this.propertyPublishabilityService.getPublicationDashboardMetrics(
          tenantId,
        ),
        this.propertyListingRepository.countActiveDashboardMetrics(tenantId),
        this.propertyRepository.count(tenantId, { isActive: true }),
      ]);

    return {
      kpis: {
        totalActiveProperties,
        publishedProperties: publicationMetrics.publishedProperties,
        activeSaleListings: listingCounts.sale,
        activeRentListings: listingCounts.rent,
        featuredListings: listingCounts.featured,
      },
      publishAlerts: publicationMetrics.publishAlerts,
    };
  }
}
