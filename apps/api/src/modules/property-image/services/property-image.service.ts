import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PropertyRepository } from '../../property/repositories/property.repository';
import { isStorageConfigured } from '../../storage/storage.config';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES,
  MAX_PROPERTY_IMAGES,
} from '../../storage/storage.constants';
import { S3CompatibleStorageService } from '../../storage/services/s3-compatible-storage.service';
import { StorageUploadUrlResponseDto } from '../../storage/dto/storage-upload-url-response.dto';
import { buildPropertyImageStorageKey } from '../../storage/utils/storage-key.util';
import { CreatePropertyImageDto } from '../dto/create-property-image.dto';
import { CreatePropertyImageUploadUrlDto } from '../dto/create-property-image-upload-url.dto';
import { PropertyImageResponseDto } from '../dto/property-image-response.dto';
import { ReorderPropertyImagesDto } from '../dto/reorder-property-images.dto';
import { UpdatePropertyImageDto } from '../dto/update-property-image.dto';
import { PropertyImageRepository } from '../repositories/property-image.repository';

@Injectable()
export class PropertyImageService {
  constructor(
    private readonly propertyImageRepository: PropertyImageRepository,
    private readonly propertyRepository: PropertyRepository,
    private readonly storageService: S3CompatibleStorageService,
  ) {}

  async createUploadUrl(
    dto: CreatePropertyImageUploadUrlDto,
    tenantId: string,
  ): Promise<StorageUploadUrlResponseDto> {
    this.assertStorageAvailable();
    await this.assertTenantExists(tenantId);
    await this.assertPropertyIsActiveForImage(dto.propertyId, tenantId);
    await this.assertImageLimitNotReached(dto.propertyId, tenantId);

    const storageKey = buildPropertyImageStorageKey(
      tenantId,
      dto.propertyId,
      dto.mimeType,
      dto.filename,
    );

    return this.storageService.getSignedUploadUrl(storageKey, dto.mimeType);
  }

  async create(
    dto: CreatePropertyImageDto,
    tenantId: string,
  ): Promise<PropertyImageResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertPropertyIsActiveForImage(dto.propertyId, tenantId);
    await this.assertImageLimitNotReached(dto.propertyId, tenantId);
    this.assertValidImageMetadata(dto.mimeType, dto.fileSize);

    const existingCount = await this.propertyImageRepository.countByProperty(
      dto.propertyId,
      tenantId,
    );

    const isCover = existingCount === 0 ? true : (dto.isCover ?? false);
    const url =
      dto.url ??
      (isStorageConfigured()
        ? this.storageService.getPublicUrl(dto.storageKey)
        : undefined);

    const image = await this.propertyImageRepository.createWithCoverHandling(
      {
        tenantId,
        propertyId: dto.propertyId,
        storageKey: dto.storageKey,
        url,
        altText: dto.altText,
        mimeType: dto.mimeType,
        fileSize: dto.fileSize,
        sortOrder: dto.sortOrder ?? existingCount,
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

  async reorder(
    dto: ReorderPropertyImagesDto,
    tenantId: string,
  ): Promise<PropertyImageResponseDto[]> {
    const firstImage = await this.propertyImageRepository.findById(
      dto.items[0].id,
      tenantId,
    );

    if (!firstImage) {
      throw new NotFoundException(
        `Property image with id "${dto.items[0].id}" not found`,
      );
    }

    const propertyId = firstImage.propertyId;

    await this.assertPropertyBelongsToTenant(propertyId, tenantId);

    const existingImages = await this.propertyImageRepository.findMany(
      tenantId,
      { propertyId },
    );

    if (existingImages.length === 0) {
      throw new NotFoundException(
        `No property images found for property "${propertyId}"`,
      );
    }

    const existingIds = new Set(existingImages.map((image) => image.id));

    for (const item of dto.items) {
      if (!existingIds.has(item.id)) {
        throw new BadRequestException(
          `Property image with id "${item.id}" does not belong to property "${propertyId}"`,
        );
      }
    }

    const images = await this.propertyImageRepository.reorderMany(
      tenantId,
      propertyId,
      dto.items,
    );

    if (images.length === 0) {
      throw new BadRequestException('Unable to reorder property images');
    }

    return images.map(PropertyImageResponseDto.fromEntity);
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

    if (isStorageConfigured()) {
      try {
        await this.storageService.deleteObject(existing.storageKey);
      } catch {
        // DB record is already removed; storage cleanup failure should not block the response.
      }
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

  private async assertImageLimitNotReached(
    propertyId: string,
    tenantId: string,
  ): Promise<void> {
    const count = await this.propertyImageRepository.countByProperty(
      propertyId,
      tenantId,
    );

    if (count >= MAX_PROPERTY_IMAGES) {
      throw new BadRequestException(
        `This property already has the maximum of ${MAX_PROPERTY_IMAGES} images.`,
      );
    }
  }

  private assertValidImageMetadata(
    mimeType?: string,
    fileSize?: number,
  ): void {
    if (
      mimeType &&
      !ALLOWED_IMAGE_MIME_TYPES.includes(
        mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number],
      )
    ) {
      throw new BadRequestException(
        `Unsupported mime type "${mimeType}". Allowed: ${ALLOWED_IMAGE_MIME_TYPES.join(', ')}`,
      );
    }

    if (fileSize != null && fileSize > MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES) {
      throw new BadRequestException(
        `File size exceeds the maximum of ${MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES} bytes.`,
      );
    }
  }

  private assertStorageAvailable(): void {
    if (!isStorageConfigured()) {
      throw new ServiceUnavailableException(
        'Storage is not configured on this server.',
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
