import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { CreatePropertyImageDto } from '../dto/create-property-image.dto';
import { PropertyImageResponseDto } from '../dto/property-image-response.dto';
import { UpdatePropertyImageDto } from '../dto/update-property-image.dto';
import { PropertyImageRepository } from '../repositories/property-image.repository';

@Injectable()
export class PropertyImageService {
  constructor(
    private readonly propertyImageRepository: PropertyImageRepository,
    private readonly propertyRepository: PropertyRepository,
  ) {}

  async create(
    dto: CreatePropertyImageDto,
    tenantId: string,
  ): Promise<PropertyImageResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertPropertyIsActiveForImage(dto.propertyId, tenantId);

    const existingCount = await this.propertyImageRepository.countByProperty(
      dto.propertyId,
      tenantId,
    );

    const isCover = existingCount === 0 ? true : (dto.isCover ?? false);

    const image = await this.propertyImageRepository.createWithCoverHandling(
      {
        tenantId,
        propertyId: dto.propertyId,
        storageKey: dto.storageKey,
        url: dto.url,
        altText: dto.altText,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        sortOrder: dto.sortOrder ?? 0,
        isCover,
      },
      isCover,
    );

    return PropertyImageResponseDto.fromEntity(image);
  }

  async findAll(
    tenantId: string,
    propertyId: string,
  ): Promise<PropertyImageResponseDto[]> {
    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const images = await this.propertyImageRepository.findMany(tenantId, {
      propertyId,
    });

    return images.map(PropertyImageResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<PropertyImageResponseDto> {
    const image = await this.propertyImageRepository.findById(id, tenantId);

    if (!image) {
      throw new NotFoundException(`Property image with id "${id}" not found`);
    }

    return PropertyImageResponseDto.fromEntity(image);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdatePropertyImageDto,
  ): Promise<PropertyImageResponseDto> {
    const existing = await this.propertyImageRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property image with id "${id}" not found`);
    }

    const updateData = this.toUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return PropertyImageResponseDto.fromEntity(existing);
    }

    const demoteOthers = dto.isCover === true;

    const image = await this.propertyImageRepository.updateWithCoverHandling(
      id,
      tenantId,
      existing.propertyId,
      updateData,
      demoteOthers,
    );

    if (!image) {
      throw new NotFoundException(`Property image with id "${id}" not found`);
    }

    return PropertyImageResponseDto.fromEntity(image);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<PropertyImageResponseDto> {
    const existing = await this.propertyImageRepository.findById(id, tenantId);

    if (!existing) {
      throw new NotFoundException(`Property image with id "${id}" not found`);
    }

    const deleted = await this.propertyImageRepository.deleteWithPromotion(
      id,
      tenantId,
      existing.propertyId,
      existing.isCover,
    );

    if (!deleted) {
      throw new NotFoundException(`Property image with id "${id}" not found`);
    }

    return PropertyImageResponseDto.fromEntity(existing);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.propertyImageRepository.tenantExists(tenantId);

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

  private async assertPropertyIsActiveForImage(
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

    if (!property.isActive) {
      throw new BadRequestException(
        'Cannot create a property image for an archived property (isActive = false). Restore the property before adding images.',
      );
    }
  }

  private toUpdateData(dto: UpdatePropertyImageDto) {
    const data: Record<string, unknown> = {};

    if (dto.url !== undefined) {
      data.url = dto.url;
    }

    if (dto.altText !== undefined) {
      data.altText = dto.altText;
    }

    if (dto.mimeType !== undefined) {
      data.mimeType = dto.mimeType;
    }

    if (dto.fileSize !== undefined) {
      data.fileSize = dto.fileSize;
    }

    if (dto.sortOrder !== undefined) {
      data.sortOrder = dto.sortOrder;
    }

    if (dto.isCover !== undefined) {
      data.isCover = dto.isCover;
    }

    return data;
  }
}
