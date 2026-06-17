import { Injectable } from '@nestjs/common';
import { evaluateListingPublishability } from '@repo/property-rules';
import { PropertyListingStatus } from '../../../../generated/prisma/client';
import { PropertyImageRepository } from '../../property-image/repositories/property-image.repository';
import { PropertyPriceRepository } from '../../property-price/repositories/property-price.repository';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { PropertyListingRepository } from '../repositories/property-listing.repository';

/**
 * Keeps ACTIVE listings aligned with public visibility after post-activation mutations.
 * Strategy: auto-pause (see docs/implementation/v1-1-operational-trust-degradation.md).
 */
@Injectable()
export class ListingOperationalTrustService {
  constructor(
    private readonly propertyListingRepository: PropertyListingRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly propertyImageRepository: PropertyImageRepository,
    private readonly propertyPriceRepository: PropertyPriceRepository,
  ) {}

  async syncActiveListingsAfterDegradation(
    propertyId: string,
    tenantId: string,
  ): Promise<string[]> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);

    if (!property) {
      return [];
    }

    const listings = await this.propertyListingRepository.findMany(tenantId, {
      propertyId,
      status: PropertyListingStatus.ACTIVE,
    });

    if (listings.length === 0) {
      return [];
    }

    const [imageCount, hasCoverImage] = await Promise.all([
      this.propertyImageRepository.countByProperty(propertyId, tenantId),
      this.propertyImageRepository.hasCoverImage(propertyId, tenantId),
    ]);

    const pausedListingIds: string[] = [];

    for (const listing of listings) {
      const hasPrimaryPrice = await this.propertyPriceRepository.hasPrimaryPrice(
        listing.id,
        tenantId,
      );

      const result = evaluateListingPublishability({
        propertyIsActive: property.isActive,
        imageCount,
        hasCoverImage,
        listingStatus: PropertyListingStatus.ACTIVE,
        hasPrimaryPrice,
      });

      if (!result.isPublishable) {
        await this.propertyListingRepository.update(listing.id, tenantId, {
          status: PropertyListingStatus.PAUSED,
        });
        pausedListingIds.push(listing.id);
      }
    }

    return pausedListingIds;
  }

  async syncActiveListingsForListing(
    listingId: string,
    tenantId: string,
  ): Promise<string[]> {
    const listing = await this.propertyListingRepository.findById(
      listingId,
      tenantId,
    );

    if (!listing) {
      return [];
    }

    return this.syncActiveListingsAfterDegradation(listing.propertyId, tenantId);
  }
}
