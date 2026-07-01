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
  PropertyWithGeoRelations,
  resolvePropertyLocation,
} from '../utils/property-location';

export class PropertyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  createdById: string;

  @ApiPropertyOptional({ nullable: true })
  assignedToId: string | null;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  internalCode: string | null;

  @ApiProperty()
  title: string;

  @ApiPropertyOptional()
  description: string | null;

  @ApiProperty({ enum: PropertyType })
  propertyType: PropertyType;

  @ApiPropertyOptional({ enum: PropertyCondition })
  condition: PropertyCondition | null;

  @ApiProperty()
  isActive: boolean;

  @ApiPropertyOptional()
  street: string | null;

  @ApiPropertyOptional()
  streetNumber: string | null;

  @ApiPropertyOptional()
  floor: string | null;

  @ApiPropertyOptional()
  apartment: string | null;

  @ApiPropertyOptional()
  neighborhood: string | null;

  @ApiProperty()
  city: string;

  @ApiPropertyOptional()
  province: string | null;

  /** @deprecated Use province. Mirrors province for backward compatibility. */
  @ApiPropertyOptional({
    deprecated: true,
    description: 'Deprecated. Same value as province.',
  })
  state: string | null;

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
  totalArea: number | null;

  @ApiPropertyOptional()
  coveredArea: number | null;

  @ApiPropertyOptional()
  uncoveredArea: number | null;

  @ApiPropertyOptional()
  lotFront: number | null;

  @ApiPropertyOptional()
  lotDepth: number | null;

  @ApiPropertyOptional()
  rooms: number | null;

  @ApiPropertyOptional()
  bedrooms: number | null;

  @ApiPropertyOptional()
  bathrooms: number | null;

  @ApiPropertyOptional()
  halfBathrooms: number | null;

  @ApiPropertyOptional()
  parkingSpaces: number | null;

  @ApiPropertyOptional()
  yearBuilt: number | null;

  @ApiPropertyOptional({ enum: Orientation })
  orientation: Orientation | null;

  @ApiPropertyOptional({ enum: PropertyLayout })
  layout: PropertyLayout | null;

  @ApiPropertyOptional({ enum: PropertyBrightness })
  brightness: PropertyBrightness | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(property: PropertyWithGeoRelations): PropertyResponseDto {
    const location = resolvePropertyLocation(property);

    return {
      id: property.id,
      tenantId: property.tenantId,
      createdById: property.createdById,
      assignedToId: property.assignedToId,
      slug: property.slug,
      internalCode: property.internalCode,
      title: property.title,
      description: property.description,
      propertyType: property.propertyType,
      condition: property.condition,
      isActive: property.isActive,
      street: property.street,
      streetNumber: property.streetNumber,
      floor: property.floor,
      apartment: property.apartment,
      neighborhood: location.neighborhood,
      city: location.city,
      province: location.province,
      state: location.province,
      country: location.country,
      countryId: location.countryId,
      provinceId: location.provinceId,
      localityId: location.localityId,
      neighborhoodId: location.neighborhoodId,
      provinceName: location.provinceName,
      localityName: location.localityName,
      neighborhoodName: location.neighborhoodName,
      postalCode: property.postalCode,
      latitude: property.latitude != null ? Number(property.latitude) : null,
      longitude: property.longitude != null ? Number(property.longitude) : null,
      googlePlaceId: property.googlePlaceId,
      formattedAddress: property.formattedAddress,
      geocodeSource: property.geocodeSource,
      geocodeAccuracy: property.geocodeAccuracy,
      totalArea: property.totalArea != null ? Number(property.totalArea) : null,
      coveredArea:
        property.coveredArea != null ? Number(property.coveredArea) : null,
      uncoveredArea:
        property.uncoveredArea != null ? Number(property.uncoveredArea) : null,
      lotFront: property.lotFront != null ? Number(property.lotFront) : null,
      lotDepth: property.lotDepth != null ? Number(property.lotDepth) : null,
      rooms: property.rooms,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      halfBathrooms: property.halfBathrooms,
      parkingSpaces: property.parkingSpaces,
      yearBuilt: property.yearBuilt,
      orientation: property.orientation,
      layout: property.layout,
      brightness: property.brightness,
      createdAt: property.createdAt,
      updatedAt: property.updatedAt,
    };
  }
}
