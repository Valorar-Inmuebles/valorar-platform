import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  DevelopmentImage,
  DevelopmentStatus,
  PropertyFeatureCategory,
} from '../../../../generated/prisma/client';

export class PublicDevelopmentCoverImageDto {
  @ApiProperty()
  url: string | null;

  @ApiProperty()
  storageKey: string;

  @ApiPropertyOptional()
  altText: string | null;
}

export class PublicDevelopmentCardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  shortDescription: string;

  @ApiPropertyOptional({ enum: DevelopmentStatus })
  status: DevelopmentStatus | null;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiPropertyOptional()
  provinceId: string | null;

  @ApiPropertyOptional()
  provinceName: string | null;

  @ApiPropertyOptional()
  localityId: string | null;

  @ApiPropertyOptional()
  localityName: string | null;

  @ApiPropertyOptional()
  neighborhoodId: string | null;

  @ApiPropertyOptional()
  neighborhoodName: string | null;

  @ApiProperty({ type: PublicDevelopmentCoverImageDto })
  coverImage: PublicDevelopmentCoverImageDto;

  @ApiPropertyOptional()
  priceFrom: number | null;

  @ApiPropertyOptional({ enum: Currency })
  currency: Currency | null;
}

export class PublicDevelopmentImageDto {
  @ApiProperty()
  id: string;

  @ApiPropertyOptional()
  url: string | null;

  @ApiProperty()
  storageKey: string;

  @ApiPropertyOptional()
  altText: string | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  isCover: boolean;
}

export class PublicDevelopmentFeatureDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: PropertyFeatureCategory })
  category: PropertyFeatureCategory;

  @ApiPropertyOptional()
  value: string | null;
}

export class PublicDevelopmentTypologyFeatureDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: PropertyFeatureCategory })
  category: PropertyFeatureCategory;

  @ApiPropertyOptional()
  value: string | null;
}

export class PublicDevelopmentTypologyDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  totalCount: number | null;

  @ApiPropertyOptional()
  availableCount: number | null;

  @ApiPropertyOptional()
  surfaceFrom: number | null;

  @ApiPropertyOptional()
  surfaceTo: number | null;

  @ApiPropertyOptional()
  priceFrom: number | null;

  @ApiPropertyOptional({ enum: Currency })
  currency: Currency | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty({ type: PublicDevelopmentTypologyFeatureDto, isArray: true })
  features: PublicDevelopmentTypologyFeatureDto[];
}

export class PublicDevelopmentCommercializationDto {
  @ApiPropertyOptional()
  priceFrom: number | null;

  @ApiPropertyOptional({ enum: Currency })
  currency: Currency | null;

  @ApiProperty()
  hasFinancing: boolean;

  @ApiPropertyOptional()
  financingDescription: string | null;

  @ApiProperty()
  hasParkingSpaces: boolean;

  @ApiPropertyOptional()
  parkingSpacesCount: number | null;
}

export class PublicDevelopmentDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ enum: DevelopmentStatus })
  status: DevelopmentStatus | null;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiPropertyOptional()
  province: string | null;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  provinceId: string | null;

  @ApiPropertyOptional()
  provinceName: string | null;

  @ApiPropertyOptional()
  localityId: string | null;

  @ApiPropertyOptional()
  localityName: string | null;

  @ApiPropertyOptional()
  neighborhoodId: string | null;

  @ApiPropertyOptional()
  neighborhoodName: string | null;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiProperty({ type: PublicDevelopmentCoverImageDto })
  coverImage: PublicDevelopmentCoverImageDto;

  @ApiProperty({ type: PublicDevelopmentCommercializationDto })
  commercialization: PublicDevelopmentCommercializationDto;

  @ApiProperty({ type: PublicDevelopmentImageDto, isArray: true })
  gallery: PublicDevelopmentImageDto[];

  @ApiProperty({ type: PublicDevelopmentFeatureDto, isArray: true })
  features: PublicDevelopmentFeatureDto[];

  @ApiProperty({ type: PublicDevelopmentTypologyDto, isArray: true })
  typologies: PublicDevelopmentTypologyDto[];
}

export class PublicDevelopmentListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class PublicDevelopmentListResponseDto {
  @ApiProperty({ type: PublicDevelopmentCardDto, isArray: true })
  data: PublicDevelopmentCardDto[];

  @ApiProperty({ type: PublicDevelopmentListMetaDto })
  meta: PublicDevelopmentListMetaDto;
}
