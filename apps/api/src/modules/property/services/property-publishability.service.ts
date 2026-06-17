import {

  Injectable,

  NotFoundException,

} from '@nestjs/common';

import { evaluateListingPublishability } from '@repo/property-rules';

import type {

  Property,

  PropertyListing,

  PropertyListingType,

} from '../../../../generated/prisma/client';

import type { PublicationDashboardMetrics } from '../dto/property-publication-dashboard-metrics.dto';

import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';

import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';

import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';

import { PropertyPublishabilityResponseDto } from '../dto/property-publishability-response.dto';

import { PropertyPublishabilitySummaryItemDto } from '../dto/property-publishability-summary.dto';

import { PropertyRepository } from '../repositories/property.repository';

import {

  buildPublicPropertyUrl,

  resolveCommercialStatusVariant,

} from '../utils/public-property-url';



type TenantPublicationContext = {

  properties: Property[];

  listingsByPropertyId: Map<string, PropertyListing[]>;

  imageStats: Map<string, { imageCount: number; hasCoverImage: boolean }>;

  primaryPriceListingIds: Set<string>;

};



@Injectable()

export class PropertyPublishabilityService {

  constructor(

    private readonly propertyRepository: PropertyRepository,

    private readonly propertyListingRepository: PropertyListingRepository,

    private readonly propertyImageRepository: PropertyImageRepository,

    private readonly propertyPriceRepository: PropertyPriceRepository,

  ) {}



  async evaluate(

    propertyId: string,

    listingId: string,

    tenantId: string,

  ): Promise<PropertyPublishabilityResponseDto> {

    const property = await this.propertyRepository.findById(propertyId, tenantId);



    if (!property) {

      throw new NotFoundException(`Property with id "${propertyId}" not found`);

    }



    const listing = await this.propertyListingRepository.findById(

      listingId,

      tenantId,

    );



    if (!listing || listing.propertyId !== propertyId) {

      throw new NotFoundException(

        `Property listing with id "${listingId}" not found for this property`,

      );

    }



    const [imageCount, hasCoverImage, hasPrimaryPrice] = await Promise.all([

      this.propertyImageRepository.countByProperty(propertyId, tenantId),

      this.propertyImageRepository.hasCoverImage(propertyId, tenantId),

      this.propertyPriceRepository.hasPrimaryPrice(listingId, tenantId),

    ]);



    const result = evaluateListingPublishability({

      propertyIsActive: property.isActive,

      imageCount,

      hasCoverImage,

      listingStatus: listing.status,

      hasPrimaryPrice,

    });



    return PropertyPublishabilityResponseDto.fromChecklistResult(result);

  }



  async summarizeForTenant(

    tenantId: string,

  ): Promise<PropertyPublishabilitySummaryItemDto[]> {

    const context = await this.loadTenantPublicationContext(tenantId);



    if (context.properties.length === 0) {

      return [];

    }



    return context.properties.map((property) => {

      const propertyListings = context.listingsByPropertyId.get(property.id) ?? [];

      const stats = context.imageStats.get(property.id) ?? {

        imageCount: 0,

        hasCoverImage: false,

      };



      let isAnyPublishable = false;

      let publicUrlListingType: PropertyListingType | undefined;



      for (const listing of propertyListings) {

        const result = evaluateListingPublishability({

          propertyIsActive: property.isActive,

          imageCount: stats.imageCount,

          hasCoverImage: stats.hasCoverImage,

          listingStatus: listing.status,

          hasPrimaryPrice: context.primaryPriceListingIds.has(listing.id),

        });



        if (result.isPublishable) {

          isAnyPublishable = true;



          if (!publicUrlListingType) {

            publicUrlListingType = listing.listingType;

          }

        }

      }



      const statusVariant = resolveCommercialStatusVariant(

        property.isActive,

        isAnyPublishable,

      );



      return {

        propertyId: property.id,

        statusVariant,

        isAnyPublishable,

        publicUrl: isAnyPublishable

          ? buildPublicPropertyUrl(property.slug, publicUrlListingType)

          : null,

      };

    });

  }



  async getPublicationDashboardMetrics(

    tenantId: string,

  ): Promise<PublicationDashboardMetrics> {

    const context = await this.loadTenantPublicationContext(tenantId);



    if (context.properties.length === 0) {

      return {

        publishedProperties: 0,

        publishAlerts: {

          withoutCover: 0,

          draftListingsWithPrice: 0,

          activePropertiesWithoutActiveListing: 0,

        },

      };

    }



    let publishedProperties = 0;

    let withoutCover = 0;

    let draftListingsWithPrice = 0;

    let activePropertiesWithoutActiveListing = 0;



    for (const property of context.properties) {

      const stats = context.imageStats.get(property.id) ?? {

        imageCount: 0,

        hasCoverImage: false,

      };

      const propertyListings = context.listingsByPropertyId.get(property.id) ?? [];



      let isAnyPublishable = false;

      let hasActiveListing = false;



      for (const listing of propertyListings) {

        if (

          listing.status === 'DRAFT' &&

          context.primaryPriceListingIds.has(listing.id)

        ) {

          draftListingsWithPrice += 1;

        }



        if (listing.status === 'ACTIVE') {

          hasActiveListing = true;

        }



        const result = evaluateListingPublishability({

          propertyIsActive: property.isActive,

          imageCount: stats.imageCount,

          hasCoverImage: stats.hasCoverImage,

          listingStatus: listing.status,

          hasPrimaryPrice: context.primaryPriceListingIds.has(listing.id),

        });



        if (result.isPublishable) {

          isAnyPublishable = true;

        }

      }



      if (property.isActive && !stats.hasCoverImage) {

        withoutCover += 1;

      }



      if (property.isActive && !hasActiveListing) {

        activePropertiesWithoutActiveListing += 1;

      }



      if (property.isActive && isAnyPublishable) {

        publishedProperties += 1;

      }

    }



    return {

      publishedProperties,

      publishAlerts: {

        withoutCover,

        draftListingsWithPrice,

        activePropertiesWithoutActiveListing,

      },

    };

  }



  private async loadTenantPublicationContext(

    tenantId: string,

  ): Promise<TenantPublicationContext> {

    const properties = await this.propertyRepository.findMany(tenantId);



    if (properties.length === 0) {

      return {

        properties: [],

        listingsByPropertyId: new Map(),

        imageStats: new Map(),

        primaryPriceListingIds: new Set(),

      };

    }



    const propertyIds = properties.map((property) => property.id);



    const [listings, imageStats] = await Promise.all([

      this.propertyListingRepository.findMany(tenantId),

      this.propertyImageRepository.getStatsByPropertyIds(tenantId, propertyIds),

    ]);



    const listingIds = listings.map((listing) => listing.id);

    const primaryPriceListingIds =

      await this.propertyPriceRepository.getListingIdsWithPrimaryPrice(

        tenantId,

        listingIds,

      );



    const listingsByPropertyId = new Map<string, PropertyListing[]>();



    for (const listing of listings) {

      const group = listingsByPropertyId.get(listing.propertyId) ?? [];

      group.push(listing);

      listingsByPropertyId.set(listing.propertyId, group);

    }



    return {

      properties,

      listingsByPropertyId,

      imageStats,

      primaryPriceListingIds,

    };

  }

}


