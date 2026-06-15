import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Property,
  PropertyBrightness,
  PropertyCondition,
  PropertyLayout,
  PropertyType,
  Orientation,
} from '../../../../generated/prisma/client';

export class PropertyResponseDto {
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
  state: string | null;

  @ApiProperty()
  country: string;

  @ApiPropertyOptional()
  postalCode: string | null;

  @ApiPropertyOptional()
  latitude: number | null;

  @ApiPropertyOptional()
  longitude: number | null;

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

  static fromEntity(property: Property): PropertyResponseDto {
    return {
      id: property.id,
      tenantId: property.tenantId,
      createdById: property.createdById,
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
      neighborhood: property.neighborhood,
      city: property.city,
      state: property.state,
      country: property.country,
      postalCode: property.postalCode,
      latitude: property.latitude != null ? Number(property.latitude) : null,
      longitude: property.longitude != null ? Number(property.longitude) : null,
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
