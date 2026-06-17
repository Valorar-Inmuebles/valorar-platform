import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyListingStatus } from '../../../../generated/prisma/client';
import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { ListingOperationalTrustService } from '../../property-listing/services/listing-operational-trust.service';
import { CreatePropertyPriceDto } from '../dto/create-property-price.dto';
import { PropertyPriceResponseDto } from '../dto/property-price-response.dto';
import { UpdatePropertyPriceDto } from '../dto/update-property-price.dto';
import { PropertyPriceRepository } from '../repositories/property-price.repository';

const PUBLISHABLE_LISTING_STATUSES: PropertyListingStatus[] = [
  PropertyListingStatus.ACTIVE,
  PropertyListingStatus.PAUSED,
  PropertyListingStatus.RESERVED,
];

@Injectable()
export class PropertyPriceService {
  constructor(
    private readonly propertyPriceRepository: PropertyPriceRepository,
    private readonly propertyListingRepository: PropertyListingRepository,
    private readonly listingOperationalTrustService: ListingOperationalTrustService,
  ) {}

  async create(
    dto: CreatePropertyPriceDto,
    tenantId: string,
  ): Promise<PropertyPriceResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertListingBelongsToTenant(dto.listingId, tenantId);

    const existingCount = await this.propertyPriceRepository.countByListing(
      dto.listingId,
      tenantId,
    );

    const isPrimary = existingCount === 0 ? true : (dto.isPrimary ?? false);

    const price = await this.propertyPriceRepository.createWithPrimaryHandling(
      {
        tenantId,
        listingId: dto.listingId,
        amount: dto.amount,
        currency: dto.currency,
        isPrimary,
        label: dto.label,
      },
      isPrimary,
    );

    return PropertyPriceResponseDto.fromEntity(price);
  }

  async findAll(
    tenantId: string,
    listingId: string,
  ): Promise<PropertyPriceResponseDto[]> {
    await this.assertListingBelongsToTenant(listingId, tenantId);

    const prices = await this.propertyPriceRepository.findMany(tenantId, {
      listingId,
    });

    return prices.map(PropertyPriceResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<PropertyPriceResponseDto> {
    const price = await this.propertyPriceRepository.findById(id, tenantId);

    if (!price) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    return PropertyPriceResponseDto.fromEntity(price);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePropertyPriceDto,
  ): Promise<PropertyPriceResponseDto> {
    const existing = await this.propertyPriceRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    const updateData = this.toUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return PropertyPriceResponseDto.fromEntity(existing);
    }

    if (dto.isPrimary === false && existing.isPrimary) {
      const priceCount = await this.propertyPriceRepository.countByListing(
        existing.listingId,
        tenantId,
      );

      if (priceCount === 1) {
        throw new BadRequestException(
          'Cannot demote the only price of a listing; exactly one primary price is required when prices exist',
        );
      }

      const price =
        await this.propertyPriceRepository.updateWithPrimaryDemotion(
          id,
          tenantId,
          existing.listingId,
          updateData,
        );

      if (!price) {
        throw new NotFoundException(`Property price with id "${id}" not found`);
      }

      await this.listingOperationalTrustService.syncActiveListingsForListing(
        existing.listingId,
        tenantId,
      );

      return PropertyPriceResponseDto.fromEntity(price);
    }

    const demoteOthers = dto.isPrimary === true;

    const price = await this.propertyPriceRepository.updateWithPrimaryHandling(
      id,
      tenantId,
      existing.listingId,
      updateData,
      demoteOthers,
    );

    if (!price) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    await this.listingOperationalTrustService.syncActiveListingsForListing(
      existing.listingId,
      tenantId,
    );

    return PropertyPriceResponseDto.fromEntity(price);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<PropertyPriceResponseDto> {
    const existing = await this.propertyPriceRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    const listing = await this.propertyListingRepository.findById(
      existing.listingId,
      tenantId,
    );

    if (!listing) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    const priceCount = await this.propertyPriceRepository.countByListing(
      existing.listingId,
      tenantId,
    );

    if (
      priceCount === 1 &&
      PUBLISHABLE_LISTING_STATUSES.includes(listing.status)
    ) {
      throw new BadRequestException(
        'Cannot delete the only price of a publishable property listing (ACTIVE, PAUSED, or RESERVED)',
      );
    }

    const deleted = await this.propertyPriceRepository.deleteWithPromotion(
      id,
      tenantId,
      existing.listingId,
      existing.isPrimary,
    );

    if (!deleted) {
      throw new NotFoundException(`Property price with id "${id}" not found`);
    }

    await this.listingOperationalTrustService.syncActiveListingsForListing(
      existing.listingId,
      tenantId,
    );

    return PropertyPriceResponseDto.fromEntity(existing);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.propertyPriceRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
  }

  private async assertListingBelongsToTenant(
    listingId: string,
    tenantId: string,
  ): Promise<void> {
    const listing = await this.propertyListingRepository.findById(
      listingId,
      tenantId,
    );

    if (!listing) {
      throw new BadRequestException(
        `Property listing with id "${listingId}" not found for this tenant`,
      );
    }
  }

  private toUpdateData(dto: UpdatePropertyPriceDto) {
    const data: Record<string, unknown> = {};

    if (dto.amount !== undefined) {
      data.amount = dto.amount;
    }

    if (dto.currency !== undefined) {
      data.currency = dto.currency;
    }

    if (dto.isPrimary !== undefined) {
      data.isPrimary = dto.isPrimary;
    }

    if (dto.label !== undefined) {
      data.label = dto.label;
    }

    return data;
  }
}
