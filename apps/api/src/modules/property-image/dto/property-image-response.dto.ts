import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyImage } from '../../../../generated/prisma/client';

export class PropertyImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty()
  storageKey: string;

  @ApiPropertyOptional()
  url: string | null;

  @ApiPropertyOptional()
  altText: string | null;

  @ApiPropertyOptional()
  mimeType: string | null;

  @ApiPropertyOptional()
  fileSize: number | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isCover: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(image: PropertyImage): PropertyImageResponseDto {
    return {
      id: image.id,
      tenantId: image.tenantId,
      propertyId: image.propertyId,
      storageKey: image.storageKey,
      url: image.url,
      altText: image.altText,
      mimeType: image.mimeType,
      fileSize: image.fileSize,
      sortOrder: image.sortOrder,
      isCover: image.isCover,
      createdAt: image.createdAt,
      updatedAt: image.updatedAt,
    };
  }
}
