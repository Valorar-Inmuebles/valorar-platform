import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyFeatureCategory } from '../../../../generated/prisma/client';

export class PropertyFeatureAssignmentResponseDto {
  @ApiProperty()
  featureId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiProperty({ enum: PropertyFeatureCategory })
  category: PropertyFeatureCategory;

  @ApiPropertyOptional()
  value: string | null;
}
