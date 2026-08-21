import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  DevelopmentStatus,
  GeocodeAccuracy,
  GeocodeSource,
} from '../../../../generated/prisma/client';
import {
  DevelopmentWithGeoRelations,
  resolveDevelopmentLocation,
} from '../utils/development-location';

export class DevelopmentResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdById: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  internalCode: string | null;

  @ApiProperty()
  title: string;

  @ApiProperty()
  shortDescription: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional({ enum: DevelopmentStatus })
  status: DevelopmentStatus | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  street: string | null;

  @ApiPropertyOptional()
  streetNumber: string | null;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  province: string | null;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  countryId: string | null;

  @ApiPropertyOptional()
  provinceId: string | null;

  @ApiPropertyOptional()
  localityId: string | null;

  @ApiPropertyOptional()
  neighborhoodId: string | null;

  @ApiPropertyOptional()
  provinceName: string | null;

  @ApiPropertyOptional()
  localityName: string | null;

  @ApiPropertyOptional()
  neighborhoodName: string | null;

  @ApiPropertyOptional()
  postalCode: string | null;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

  @ApiPropertyOptional()
  googlePlaceId: string | null;

  @ApiPropertyOptional()
  formattedAddress: string | null;

  @ApiPropertyOptional({ enum: GeocodeSource })
  geocodeSource: GeocodeSource | null;

  @ApiPropertyOptional({ enum: GeocodeAccuracy })
  geocodeAccuracy: GeocodeAccuracy | null;

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

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    development: DevelopmentWithGeoRelations,
  ): DevelopmentResponseDto {
    const location = resolveDevelopmentLocation(development);

    return {
      id: development.id,
      tenantId: development.tenantId,
      createdById: development.createdById,
      slug: development.slug,
      internalCode: development.internalCode,
      title: development.title,
      shortDescription: development.shortDescription,
      description: development.description,
      status: development.status,
      isActive: development.isActive,
      street: development.street,
      streetNumber: development.streetNumber,
      neighborhood: location.neighborhood,
      city: location.city,
      province: location.province,
      country: location.country,
      countryId: location.countryId,
      provinceId: location.provinceId,
      localityId: location.localityId,
      neighborhoodId: location.neighborhoodId,
      provinceName: location.provinceName,
      localityName: location.localityName,
      neighborhoodName: location.neighborhoodName,
      postalCode: development.postalCode,
      latitude: development.latitude ? Number(development.latitude) : null,
      longitude: development.longitude ? Number(development.longitude) : null,
      googlePlaceId: development.googlePlaceId,
      formattedAddress: development.formattedAddress,
      geocodeSource: development.geocodeSource,
      geocodeAccuracy: development.geocodeAccuracy,
      priceFrom: development.priceFrom ? Number(development.priceFrom) : null,
      currency: development.currency,
      hasFinancing: development.hasFinancing,
      financingDescription: development.financingDescription,
      hasParkingSpaces: development.hasParkingSpaces,
      parkingSpacesCount: development.parkingSpacesCount,
      sortOrder: development.sortOrder,
      createdAt: development.createdAt,
      updatedAt: development.updatedAt,
    };
  }
}
