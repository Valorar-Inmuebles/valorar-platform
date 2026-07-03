import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DevelopmentStatus,
  GeocodeAccuracy,
  GeocodeSource,
} from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
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

export class CreateDevelopmentDto {
  @ApiProperty({ example: 'torre-palermo' })
  @IsString()
  @Length(3, 120)
  @Matches(SLUG_PATTERN, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'Torre Palermo' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  shortDescription: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ enum: DevelopmentStatus })
  @IsOptional()
  @IsEnum(DevelopmentStatus)
  status?: DevelopmentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  internalCode?: string;

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
  neighborhood?: string;

  @ApiPropertyOptional()
  @ValidateIf((dto: CreateDevelopmentDto) => !dto.localityId)
  @IsString()
  @IsNotEmpty()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  province?: string;

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

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  hasParkingSpaces?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @ValidateIf((dto: CreateDevelopmentDto) => dto.hasParkingSpaces === true)
  @IsOptional()
  @IsNumber()
  @Min(1)
  parkingSpacesCount?: number | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  formattedAddress?: string;

  @ApiPropertyOptional({ enum: GeocodeSource })
  @IsOptional()
  @IsEnum(GeocodeSource)
  geocodeSource?: GeocodeSource;

  @ApiPropertyOptional({ enum: GeocodeAccuracy })
  @IsOptional()
  @IsEnum(GeocodeAccuracy)
  geocodeAccuracy?: GeocodeAccuracy;
}
