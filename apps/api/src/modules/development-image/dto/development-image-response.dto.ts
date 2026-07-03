import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DevelopmentImage } from '../../../../generated/prisma/client';

export class DevelopmentImageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  developmentId: string;

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

  static fromEntity(image: DevelopmentImage): DevelopmentImageResponseDto {
    return {
      id: image.id,
      tenantId: image.tenantId,
      developmentId: image.developmentId,
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
