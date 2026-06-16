import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  PropertyFeatureCategory,
  PropertyListingType,
  PropertyType,
} from '../../../../generated/prisma/client';

export class PublicCoverImageDto {
  @ApiProperty()
  url: string | null;

  @ApiProperty()
  storageKey: string;

  @ApiPropertyOptional()
  altText: string | null;
}

export class PublicPropertyCardDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: PropertyType })
  propertyType: PropertyType;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiProperty({ type: PublicCoverImageDto })
  coverImage: PublicCoverImageDto;

  @ApiProperty()
  price: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiPropertyOptional()
  bedrooms: number | null;

  @ApiPropertyOptional()
  bathrooms: number | null;

  @ApiPropertyOptional()
  totalArea: number | null;

  @ApiProperty({ enum: PropertyListingType })
  listingType: PropertyListingType;
}

export class PublicPropertyImageDto {
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

export class PublicPropertyPrimaryPriceDto {
  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiPropertyOptional()
  label: string | null;
}

export class PublicPropertyListingDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: PropertyListingType })
  listingType: PropertyListingType;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional()
  publishedAt: Date | null;

  @ApiPropertyOptional()
  expensesAmount: number | null;

  @ApiPropertyOptional({ enum: Currency })
  expensesCurrency: Currency | null;

  @ApiProperty({ type: PublicPropertyPrimaryPriceDto })
  primaryPrice: PublicPropertyPrimaryPriceDto;
}

export class PublicPropertyFeatureDto {
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

export class PublicPropertyDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  slug: string;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: PropertyType })
  propertyType: PropertyType;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiPropertyOptional()
  province: string | null;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiPropertyOptional()
  bedrooms: number | null;

  @ApiPropertyOptional()
  bathrooms: number | null;

  @ApiPropertyOptional()
  totalArea: number | null;

  @ApiProperty({ type: PublicCoverImageDto })
  coverImage: PublicCoverImageDto;

  @ApiProperty({ type: PublicPropertyPrimaryPriceDto })
  price: PublicPropertyPrimaryPriceDto;

  @ApiProperty({ enum: PropertyListingType })
  listingType: PropertyListingType;

  @ApiProperty({ type: PublicPropertyListingDto })
  listing: PublicPropertyListingDto;

  @ApiProperty({ type: PublicPropertyImageDto, isArray: true })
  gallery: PublicPropertyImageDto[];

  @ApiProperty({ type: PublicPropertyFeatureDto, isArray: true })
  features: PublicPropertyFeatureDto[];

  @ApiProperty({ enum: PropertyListingType, isArray: true })
  availableListingTypes: PropertyListingType[];
}

export class PublicPropertyListMetaDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;

  @ApiProperty()
  total: number;

  @ApiProperty()
  totalPages: number;
}

export class PublicPropertyListResponseDto {
  @ApiProperty({ type: PublicPropertyCardDto, isArray: true })
  data: PublicPropertyCardDto[];

  @ApiProperty({ type: PublicPropertyListMetaDto })
  meta: PublicPropertyListMetaDto;
}
