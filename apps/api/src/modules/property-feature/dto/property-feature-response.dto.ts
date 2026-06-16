import { ApiProperty } from '@nestjs/swagger';
import {
  PropertyFeature,
  PropertyFeatureCategory,
} from '../../../../generated/prisma/client';

export class PropertyFeatureResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: PropertyFeatureCategory })
  category: PropertyFeatureCategory;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(feature: PropertyFeature): PropertyFeatureResponseDto {
    return {
      id: feature.id,
      name: feature.name,
      slug: feature.slug,
      category: feature.category,
      isActive: feature.isActive,
      sortOrder: feature.sortOrder,
      createdAt: feature.createdAt,
      updatedAt: feature.updatedAt,
    };
  }
}
