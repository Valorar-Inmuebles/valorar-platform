import { Injectable, NotFoundException } from '@nestjs/common';
import { evaluateListingPublishability } from '@repo/property-rules';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.type';
import { PropertyListingResponseDto } from '../../property-listing/dto/property-listing-response.dto';
import { PropertyPriceResponseDto } from '../../property-price/dto/property-price-response.dto';
import { PropertyDetailContextResponseDto } from '../dto/property-detail-context-response.dto';
import { PropertyPublishabilityResponseDto } from '../dto/property-publishability-response.dto';
import { PropertyResponseDto } from '../dto/property-response.dto';
import { PropertyDetailContextRepository } from '../repositories/property-detail-context.repository';
import { PropertyAccessService } from './property-access.service';

@Injectable()
export class PropertyDetailContextService {
  constructor(
    private readonly repository: PropertyDetailContextRepository,
    private readonly access: PropertyAccessService,
  ) {}

  async findOne(
    id: string,
    tenantId: string,
    user: AuthenticatedUser,
  ): Promise<PropertyDetailContextResponseDto> {
    // Same visibility filter as GET /properties/:id, including assigned/shared agents.
    const visibility = await this.access.buildListWhere(tenantId, user, { id });
    const property = await this.repository.findVisible(
      id,
      tenantId,
      visibility,
    );
    if (!property)
      throw new NotFoundException(`Property with id "${id}" not found`);

    const imageCount = property._count.images;
    const hasCoverImage = property.images.length > 0;
    return {
      property: PropertyResponseDto.fromEntity(property),
      imageCount,
      hasCoverImage,
      featureCount: property._count.featureAssignments,
      operations: property.listings.map((listing) => ({
        listing: PropertyListingResponseDto.fromEntity(listing),
        prices: listing.prices.map((price) =>
          PropertyPriceResponseDto.fromEntity(price),
        ),
        publishability: PropertyPublishabilityResponseDto.fromChecklistResult(
          evaluateListingPublishability({
            propertyIsActive: property.isActive,
            imageCount,
            hasCoverImage,
            listingStatus: listing.status,
            hasPrimaryPrice: listing.prices.some((price) => price.isPrimary),
          }),
        ),
      })),
    };
  }
}
