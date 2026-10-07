import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateBy,
} from 'class-validator';
import {
  PropertyListingType,
  PropertyType,
} from '../../../../generated/prisma/client';
import type { PropertyAttentionFilter } from '@repo/property-rules';

export const PROPERTY_LIST_STATUSES = [
  'all',
  'active',
  'published',
  'commercial-draft',
  'archived',
] as const;
export const PROPERTY_LIST_SORTS = [
  'updatedAt',
  'title',
  'propertyType',
  'location',
  'commercialStatus',
  'createdBy',
] as const;
export const PROPERTY_LIST_ATTENTION: PropertyAttentionFilter[] = [
  'without-images',
  'without-commercialization',
  'without-description',
  'without-features',
  'pending-publication',
  'without-price',
  'recently-archived',
];

// Do not coerce arrays, blanks, booleans, decimals or exponent notation.
const integer = ({ value }: { value: unknown }) =>
  typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;

export class PropertyListQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1, maximum: 1_000_000 })
  @Transform(integer)
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  page = 1;

  @ApiPropertyOptional({ enum: [20, 50, 100], default: 20 })
  @Transform(integer)
  @IsIn([20, 50, 100])
  pageSize = 20;

  @ApiPropertyOptional({ maxLength: 160 })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @ValidateBy({
    name: 'searchLength',
    validator: {
      validate: (value: unknown) =>
        typeof value === 'string' &&
        value.length <= 160 &&
        !value.includes('\0'),
    },
  })
  search?: string;

  @ApiPropertyOptional({ enum: PROPERTY_LIST_STATUSES, default: 'all' })
  @IsIn(PROPERTY_LIST_STATUSES)
  commercialStatus: (typeof PROPERTY_LIST_STATUSES)[number] = 'all';

  @ApiPropertyOptional({ enum: PropertyType })
  @IsOptional()
  @IsEnum(PropertyType)
  propertyType?: PropertyType;

  @ApiPropertyOptional({ enum: PropertyListingType })
  @IsOptional()
  @IsEnum(PropertyListingType)
  listingType?: PropertyListingType;

  @ApiPropertyOptional({ enum: PROPERTY_LIST_ATTENTION })
  @IsOptional()
  @IsIn(PROPERTY_LIST_ATTENTION)
  attention?: PropertyAttentionFilter;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @Matches(/^[^\0]*$/)
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @Matches(/^[^\0]*$/)
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/\S/)
  @Matches(/^[^\0]*$/)
  neighborhoodId?: string;

  @ApiPropertyOptional({ enum: PROPERTY_LIST_SORTS, default: 'updatedAt' })
  @IsIn(PROPERTY_LIST_SORTS)
  sortBy: (typeof PROPERTY_LIST_SORTS)[number] = 'updatedAt';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsIn(['asc', 'desc'])
  sortOrder: 'asc' | 'desc' = 'desc';
}
