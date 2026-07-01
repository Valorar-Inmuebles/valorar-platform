import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
  PropertyType,
  Orientation,
  GeocodeSource,
  GeocodeAccuracy,
} from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateIf,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreatePropertyDto {
  @ApiProperty({
    description: 'URL-friendly slug unique within the tenant',
    example: 'casa-centro-belgrano',
  })
  @IsString()
  @Length(3, 120)
  @Matches(SLUG_PATTERN, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'Casa en Belgrano' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Internal CRM code' })
  @IsOptional()
  @IsString()
  internalCode?: string;

  @ApiProperty({ enum: PropertyType })
  @IsEnum(PropertyType)
  propertyType: PropertyType;

  @ApiPropertyOptional({ enum: PropertyCondition })
  @IsOptional()
  @IsEnum(PropertyCondition)
  condition?: PropertyCondition;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  streetNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  floor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhood?: string;

  @ApiPropertyOptional({
    example: 'Buenos Aires',
    description: 'Legacy city/locality text. Required when localityId is not set.',
  })
  @ValidateIf((dto: CreatePropertyDto) => !dto.localityId)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional({ description: 'Geo catalog country ID' })
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional({ description: 'Geo catalog province ID' })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Geo catalog locality ID' })
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiPropertyOptional({ description: 'Geo catalog neighborhood ID (optional)' })
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @ApiPropertyOptional({ description: 'Province or state name' })
  @IsOptional()
  @IsString()
  province?: string;

  /** @deprecated Use province instead. Accepted for backward compatibility. */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Deprecated. Use province instead.',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ default: 'AR' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ minimum: -90, maximum: 90 })
  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180 })
  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Google Places ID. Optional enrichment field.',
  })
  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @ApiPropertyOptional({
    description: 'Formatted address snapshot. Optional enrichment field.',
  })
  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @ApiPropertyOptional({
    enum: GeocodeSource,
    description: 'Source of geocoding data. Optional enrichment field.',
  })
  @IsOptional()
  @IsEnum(GeocodeSource)
  geocodeSource?: GeocodeSource;

  @ApiPropertyOptional({
    enum: GeocodeAccuracy,
    description: 'Accuracy of coordinates. Optional enrichment field.',
  })
  @IsOptional()
  @IsEnum(GeocodeAccuracy)
  geocodeAccuracy?: GeocodeAccuracy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  coveredArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  uncoveredArea?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lotFront?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  lotDepth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  rooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  halfBathrooms?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  parkingSpaces?: number;

  @ApiPropertyOptional({ minimum: 1800, maximum: 2100 })
  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(2100)
  yearBuilt?: number;

  @ApiPropertyOptional({ enum: Orientation })
  @IsOptional()
  @IsEnum(Orientation)
  orientation?: Orientation;

  @ApiPropertyOptional({ enum: PropertyLayout })
  @IsOptional()
  @IsEnum(PropertyLayout)
  layout?: PropertyLayout;

  @ApiPropertyOptional({ enum: PropertyBrightness })
  @IsOptional()
  @IsEnum(PropertyBrightness)
  brightness?: PropertyBrightness;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Commercial assignee (must belong to tenant)',
  })
  @IsOptional()
  @IsString()
  assignedToId?: string | null;
}
