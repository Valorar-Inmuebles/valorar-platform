import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { DevelopmentRepository } from '../../development/repositories/development.repository';
import { isStorageConfigured } from '../../storage/storage.config';
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_DEVELOPMENT_IMAGES,
  MAX_PROPERTY_IMAGE_FILE_SIZE_BYTES,
} from '../../storage/storage.constants';
import { S3CompatibleStorageService } from '../../storage/services/s3-compatible-storage.service';
import { StorageUploadUrlResponseDto } from '../../storage/dto/storage-upload-url-response.dto';
import { buildDevelopmentImageStorageKey } from '../../storage/utils/storage-key.util';
import { CreateDevelopmentImageDto } from '../dto/create-development-image.dto';
import { CreateDevelopmentImageUploadUrlDto } from '../dto/create-development-image-upload-url.dto';
import { DevelopmentImageResponseDto } from '../dto/development-image-response.dto';
import { ReorderDevelopmentImagesDto } from '../dto/reorder-development-images.dto';
import { UpdateDevelopmentImageDto } from '../dto/update-development-image.dto';
import { DevelopmentImageRepository } from '../repositories/development-image.repository';

@Injectable()
export class DevelopmentImageService {
  constructor(
    private readonly developmentImageRepository: DevelopmentImageRepository,
    private readonly developmentRepository: DevelopmentRepository,
    private readonly storageService: S3CompatibleStorageService,
  ) {}

  async createUploadUrl(
    dto: CreateDevelopmentImageUploadUrlDto,
    tenantId: string,
  ): Promise<StorageUploadUrlResponseDto> {
    this.assertStorageAvailable();
    await this.assertTenantExists(tenantId);
    await this.assertDevelopmentIsActiveForImage(dto.developmentId, tenantId);
    await this.assertImageLimitNotReached(dto.developmentId, tenantId);

    const storageKey = buildDevelopmentImageStorageKey(
      tenantId,
      dto.developmentId,
      dto.mimeType,
      dto.filename,
    );

    return this.storageService.getSignedUploadUrl(storageKey, dto.mimeType);
  }

  async create(
    dto: CreateDevelopmentImageDto,
    tenantId: string,
  ): Promise<DevelopmentImageResponseDto> {
    await this.assertTenantExists(tenantId);
    await this.assertDevelopmentIsActiveForImage(dto.developmentId, tenantId);
    await this.assertImageLimitNotReached(dto.developmentId, tenantId);
    this.assertValidImageMetadata(dto.mimeType, dto.fileSize);

    const existingCount =
      await this.developmentImageRepository.countByDevelopment(
        dto.developmentId,
        tenantId,
      );

    const isCover = existingCount === 0 ? true : (dto.isCover ?? false);
    const url =
      dto.url ??
      (isStorageConfigured()
        ? this.storageService.getPublicUrl(dto.storageKey)
        : undefined);

    const image =
      await this.developmentImageRepository.createWithCoverHandling(
        {
          tenantId,
          developmentId: dto.developmentId,
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

    return DevelopmentImageResponseDto.fromEntity(image);
  }

  async findAll(
    tenantId: string,
    developmentId: string,
  ): Promise<DevelopmentImageResponseDto[]> {
    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);

    const images = await this.developmentImageRepository.findMany(tenantId, {
      developmentId,
    });

    return images.map(DevelopmentImageResponseDto.fromEntity);
  }

  async findOne(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentImageResponseDto> {
    const image = await this.developmentImageRepository.findById(id, tenantId);

    if (!image) {
      throw new NotFoundException(
        `Development image with id "${id}" not found`,
      );
    }

    return DevelopmentImageResponseDto.fromEntity(image);
  }

  async reorder(
    dto: ReorderDevelopmentImagesDto,
    tenantId: string,
  ): Promise<DevelopmentImageResponseDto[]> {
    const firstImage = await this.developmentImageRepository.findById(
      dto.items[0].id,
      tenantId,
    );

    if (!firstImage) {
      throw new NotFoundException(
        `Development image with id "${dto.items[0].id}" not found`,
      );
    }

    const developmentId = firstImage.developmentId;

    await this.assertDevelopmentBelongsToTenant(developmentId, tenantId);

    const existingImages = await this.developmentImageRepository.findMany(
      tenantId,
      { developmentId },
    );

    if (existingImages.length === 0) {
      throw new NotFoundException(
        `No development images found for development "${developmentId}"`,
      );
    }

    const existingIds = new Set(existingImages.map((image) => image.id));

    for (const item of dto.items) {
      if (!existingIds.has(item.id)) {
        throw new BadRequestException(
          `Development image with id "${item.id}" does not belong to development "${developmentId}"`,
        );
      }
    }

    const images = await this.developmentImageRepository.reorderMany(
      tenantId,
      developmentId,
      dto.items,
    );

    if (images.length === 0) {
      throw new BadRequestException('Unable to reorder development images');
    }

    return images.map(DevelopmentImageResponseDto.fromEntity);
  }

  async update(
    id: string,
    tenantId: string,
    dto: UpdateDevelopmentImageDto,
  ): Promise<DevelopmentImageResponseDto> {
    const existing = await this.developmentImageRepository.findById(
      id,
      tenantId,
    );

    if (!existing) {
      throw new NotFoundException(
        `Development image with id "${id}" not found`,
      );
    }

    const updateData = this.toUpdateData(dto);

    if (Object.keys(updateData).length === 0) {
      return DevelopmentImageResponseDto.fromEntity(existing);
    }

    const demoteOthers = dto.isCover === true;

    const image =
      await this.developmentImageRepository.updateWithCoverHandling(
        id,
        tenantId,
        existing.developmentId,
        updateData,
        demoteOthers,
      );

    if (!image) {
      throw new NotFoundException(
        `Development image with id "${id}" not found`,
      );
    }

    return DevelopmentImageResponseDto.fromEntity(image);
  }

  async remove(
    id: string,
    tenantId: string,
  ): Promise<DevelopmentImageResponseDto> {
    const existing = await this.developmentImageRepository.findById(
      id,
      tenantId,
    );

    if (!existing) {
      throw new NotFoundException(
        `Development image with id "${id}" not found`,
      );
    }

    const deleted = await this.developmentImageRepository.deleteWithPromotion(
      id,
      tenantId,
      existing.developmentId,
      existing.isCover,
    );

    if (!deleted) {
      throw new NotFoundException(
        `Development image with id "${id}" not found`,
      );
    }

    if (isStorageConfigured()) {
      try {
        await this.storageService.deleteObject(existing.storageKey);
      } catch {
        // DB record is already removed; storage cleanup failure should not block the response.
      }
    }

    return DevelopmentImageResponseDto.fromEntity(existing);
  }

  private async assertTenantExists(tenantId: string): Promise<void> {
    const exists = await this.developmentImageRepository.tenantExists(tenantId);

    if (!exists) {
      throw new BadRequestException(`Tenant with id "${tenantId}" not found`);
    }
  }

  private async assertDevelopmentBelongsToTenant(
    developmentId: string,
    tenantId: string,
  ): Promise<void> {
    const development = await this.developmentRepository.findById(
      developmentId,
      tenantId,
    );

    if (!development) {
      throw new BadRequestException(
        `Development with id "${developmentId}" not found for this tenant`,
      );
    }
  }

  private async assertDevelopmentIsActiveForImage(
    developmentId: string,
    tenantId: string,
  ): Promise<void> {
    const development = await this.developmentRepository.findById(
      developmentId,
      tenantId,
    );

    if (!development) {
      throw new BadRequestException(
        `Development with id "${developmentId}" not found for this tenant`,
      );
    }

    if (!development.isActive) {
      throw new BadRequestException(
        'Cannot create a development image for an archived development (isActive = false). Restore the development before adding images.',
      );
    }
  }

  private async assertImageLimitNotReached(
    developmentId: string,
    tenantId: string,
  ): Promise<void> {
    const count = await this.developmentImageRepository.countByDevelopment(
      developmentId,
      tenantId,
    );

    if (count >= MAX_DEVELOPMENT_IMAGES) {
      throw new BadRequestException(
        `This development already has the maximum of ${MAX_DEVELOPMENT_IMAGES} images.`,
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

  private toUpdateData(dto: UpdateDevelopmentImageDto) {
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
