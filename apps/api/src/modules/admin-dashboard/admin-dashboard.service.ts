import { Injectable } from '@nestjs/common';
import { PropertyFeatureAssignmentRepository } from '../property-feature-assignment/repositories/property-feature-assignment.repository';
import { PropertyImageRepository } from '../property-image/repositories/property-image.repository';
import { PropertyListingRepository } from '../property-listing/repositories/property-listing.repository';
import { PropertyPriceRepository } from '../property-price/repositories/property-price.repository';
import { PropertyRepository } from '../property/repositories/property.repository';
import { DashboardSummaryResponseDto } from './dto/dashboard-summary-response.dto';
import { buildOperationalDashboard } from './operational-dashboard.builder';

@Injectable()
export class AdminDashboardService {
  constructor(
    private readonly propertyRepository: PropertyRepository,
    private readonly propertyListingRepository: PropertyListingRepository,
    private readonly propertyImageRepository: PropertyImageRepository,
    private readonly propertyPriceRepository: PropertyPriceRepository,
    private readonly propertyFeatureAssignmentRepository: PropertyFeatureAssignmentRepository,
  ) {}

  async getSummary(tenantId: string): Promise<DashboardSummaryResponseDto> {
    const properties =
      await this.propertyRepository.findManyWithCreator(tenantId);

    if (properties.length === 0) {
      return {
        kpis: {
          totalProperties: 0,
          published: 0,
          drafts: 0,
          archived: 0,
        },
        catalogHealth: {
          withoutImages: 0,
          withoutCommercialization: 0,
          withoutDescription: 0,
          withoutFeatures: 0,
          pendingPublication: 0,
        },
        attentionAlerts: {
          withoutImages: 0,
          withoutPrice: 0,
          withoutDescription: 0,
          withoutCommercialization: 0,
          recentlyArchived: 0,
        },
        filterSets: {
          withoutImages: [],
          withoutCommercialization: [],
          withoutDescription: [],
          withoutFeatures: [],
          pendingPublication: [],
          withoutPrice: [],
          recentlyArchived: [],
        },
        recentActivity: [],
      };
    }

    const propertyIds = properties.map((property) => property.id);

    const [listings, imageStats, images, featureCounts] = await Promise.all([
      this.propertyListingRepository.findMany(tenantId),
      this.propertyImageRepository.getStatsByPropertyIds(tenantId, propertyIds),
      this.propertyImageRepository.findMany(tenantId),
      this.propertyFeatureAssignmentRepository.countByPropertyIds(
        tenantId,
        propertyIds,
      ),
    ]);

    const listingIds = listings.map((listing) => listing.id);
    const primaryPriceListingIds =
      await this.propertyPriceRepository.getListingIdsWithPrimaryPrice(
        tenantId,
        listingIds,
      );

    const result = buildOperationalDashboard({
      properties,
      listings,
      imageStats,
      images,
      featureCounts,
      primaryPriceListingIds,
    });

    return {
      kpis: result.kpis,
      catalogHealth: result.catalogHealth,
      attentionAlerts: result.attentionAlerts,
      filterSets: result.filterSets,
      recentActivity: result.recentActivity.map((item) => ({
        id: item.id,
        type: item.type,
        timestamp: item.timestamp.toISOString(),
        propertyId: item.propertyId,
        propertyTitle: item.propertyTitle,
        actorName: item.actorName,
        label: item.label,
        detail: item.detail,
      })),
    };
  }
}
