import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyListingStatus } from '../../../../generated/prisma/client';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { CreatePropertyListingDto } from '../dto/create-property-listing.dto';
import { PropertyListingResponseDto } from '../dto/property-listing-response.dto';
import { UpdatePropertyListingDto } from '../dto/update-property-listing.dto';
import { PropertyListingRepository } from '../repositories/property-listing.repository';

const ALLOWED_STATUS_TRANSITIONS: Record<
  PropertyListingStatus,
  PropertyListingStatus[]
> = {
  DRAFT: ['ACTIVE', 'CLOSED'],
  ACTIVE: ['PAUSED', 'RESERVED', 'CLOSED'],
  PAUSED: ['ACTIVE', 'CLOSED'],
  RESERVED: ['ACTIVE', 'CLOSED'],
  CLOSED: ['ACTIVE'],
};

@Injectable()
export class PropertyListingService {
  constructor(
    private readonly propertyListingRepository: PropertyListingRepository,
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async create(
    dto: CreatePropertyListingDto,
  ): Promise<PropertyListingResponseDto> {
    await this.assertTenantExists(dto.tenantId);
    await this.assertPropertyIsActiveForListing(
      dto.propertyId,
      dto.tenantId,
      'create',
    );
    await this.assertListingTypeIsUnique(dto.propertyId, dto.listingType);

    const listing = await this.propertyListingRepository.create({
      tenantId: dto.tenantId,
      propertyId: dto.propertyId,
      listingType: dto.listingType,
      status: PropertyListingStatus.DRAFT,
      expensesAmount: dto.expensesAmount,
      expensesCurrency: dto.expensesCurrency,
      isFeatured: dto.isFeatured ?? false,
    });

    return PropertyListingResponseDto.fromEntity(listing);
  }

  async findAll(
    tenantId: string,
    filters: {
      propertyId?: string;
      listingType?: CreatePropertyListingDto['listingType'];
      status?: PropertyListingStatus;
    } = {},
  ): Promise<PropertyListingResponseDto[]> {
    if (filters.propertyId) {
      await this.assertPropertyBelongsToTenant(filters.propertyId, tenantId);
    }

    const listings = await this.propertyListingRepository.findMany(tenantId, {
      propertyId: filters.propertyId,
      listingType: filters.listingType,
      status: filters.status,
    });

    return listings.map(PropertyListingResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<PropertyListingResponseDto> {
    const listing = await this.propertyListingRepository.findById(id, tenantId);

    if (!listing) {
      throw new NotFoundException(`Property listing with id "${id}" not found`);
    }

    return PropertyListingResponseDto.fromEntity(listing);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePropertyListingDto,
  ): Promise<PropertyListingResponseDto> {
    const existing = await this.propertyListingRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property listing with id "${id}" not found`);
    }

    if (
      dto.status === PropertyListingStatus.ACTIVE &&
      existing.status !== PropertyListingStatus.ACTIVE
    ) {
      await this.assertPropertyIsActiveForListing(
        existing.propertyId,
        tenantId,
        'activate',
      );
    }

    const updateData = this.toUpdateData(existing, dto);

    if (Object.keys(updateData).length === 0) {
      return PropertyListingResponseDto.fromEntity(existing);
    }

    const listing = await this.propertyListingRepository.update(
      id,
      tenantId,
      updateData,
    );

    if (!listing) {
      throw new NotFoundException(`Property listing with id "${id}" not found`);
    }

    return PropertyListingResponseDto.fromEntity(listing);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<PropertyListingResponseDto> {
    const existing = await this.propertyListingRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property listing with id "${id}" not found`);
    }

    if (existing.status === PropertyListingStatus.CLOSED) {
      return PropertyListingResponseDto.fromEntity(existing);
    }

    const listing = await this.propertyListingRepository.softClose(id, tenantId);

    if (!listing) {
      throw new NotFoundException(`Property listing with id "${id}" not found`);
    }

    return PropertyListingResponseDto.fromEntity(listing);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.propertyListingRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
  }

  private async assertPropertyBelongsToTenant(
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const property = await this.propertyRepository.findById(
      propertyId,
      tenantId,
    );

    if (!property) {
      throw new BadRequestException(
        `Property with id "${propertyId}" not found for this tenant`,
      );
    }
  }

  private async assertListingTypeIsUnique(
    propertyId: string,
    listingType: CreatePropertyListingDto['listingType'],
    excludeId?: string,
  ): Promise<void> {
    const existing =
      await this.propertyListingRepository.findByPropertyAndListingType(
        propertyId,
        listingType,
        excludeId,
      );

    if (existing) {
      if (existing.status === PropertyListingStatus.CLOSED) {
        throw new ConflictException(
          `A closed listing with type "${listingType}" already exists for this property. Reactivate it (CLOSED → ACTIVE) instead of creating a new one.`,
        );
      }

      throw new ConflictException(
        `A listing with type "${listingType}" already exists for this property`,
      );
    }
  }

  private async assertPropertyIsActiveForListing(
    propertyId: string,
    tenantId: string,
    action: 'create' | 'activate',
  ): Promise<void> {
    const property = await this.propertyRepository.findById(propertyId, tenantId);

    if (!property) {
      throw new BadRequestException(
        `Property with id "${propertyId}" not found for this tenant`,
      );
    }

    if (!property.isActive) {
      const message =
        action === 'create'
          ? 'Cannot create a property listing for an archived property (isActive = false). Restore the property before creating listings.'
          : 'Cannot activate a property listing while the property is archived (isActive = false). Restore the property before activating listings.';

      throw new BadRequestException(message);
    }
  }

  private toUpdateData(
    existing: { status: PropertyListingStatus; publishedAt: Date | null },
    dto: UpdatePropertyListingDto,
  ) {
    const data: Record<string, unknown> = {};

    if (dto.status !== undefined) {
      this.assertStatusTransition(existing.status, dto.status);
      data.status = dto.status;

      if (dto.status === PropertyListingStatus.ACTIVE) {
        if (existing.publishedAt == null) {
          data.publishedAt = new Date();
        }

        if (existing.status === PropertyListingStatus.CLOSED) {
          data.closedAt = null;
        }
      }

      if (dto.status === PropertyListingStatus.CLOSED) {
        data.closedAt = new Date();
      }
    }

    if (dto.expensesAmount !== undefined) {
      data.expensesAmount = dto.expensesAmount;
    }

    if (dto.expensesCurrency !== undefined) {
      data.expensesCurrency = dto.expensesCurrency;
    }

    if (dto.isFeatured !== undefined) {
      data.isFeatured = dto.isFeatured;
    }

    return data;
  }

  private assertStatusTransition(
    current: PropertyListingStatus,
    next: PropertyListingStatus,
  ): void {
    if (current === next) {
      return;
    }

    const allowed = ALLOWED_STATUS_TRANSITIONS[current];

    if (!allowed.includes(next)) {
      throw new BadRequestException(
        `Cannot transition listing status from "${current}" to "${next}"`,
      );
    }
  }
}
