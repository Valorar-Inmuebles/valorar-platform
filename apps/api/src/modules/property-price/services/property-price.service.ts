import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyListingStatus } from '../../../../generated/prisma/client';
import { PropertyListingRepository } from '../../property-listing/repositories/property-listing.repository';
import { CreatePropertyPriceDto } from '../dto/create-property-price.dto';
import { PropertyPriceResponseDto } from '../dto/property-price-response.dto';
import { UpdatePropertyPriceDto } from '../dto/update-property-price.dto';
import { PropertyPriceRepository } from '../repositories/property-price.repository';

@Injectable()
export class PropertyPriceService {
  constructor(
    private readonly propertyPriceRepository: PropertyPriceRepository,
    private readonly propertyListingRepository: PropertyListingRepository,
  ) {}

  async create(
    dto: CreatePropertyPriceDto,
  ): Promise<PropertyPriceResponseDto> {
    await this.assertTenantExists(dto.tenantId);
    await this.assertListingBelongsToTenant(dto.listingId, dto.tenantId);

    const existingCount = await this.propertyPriceRepository.countByListing(
      dto.listingId,
      dto.tenantId,
    );

    const isPrimary =
      existingCount === 0 ? true : (dto.isPrimary ?? false);

    const price = await this.propertyPriceRepository.createWithPrimaryHandling(
      {
        tenantId: dto.tenantId,
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
      listing.status === PropertyListingStatus.ACTIVE
    ) {
      throw new BadRequestException(
        'Cannot delete the only price of an active property listing',
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
