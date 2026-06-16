import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyFeatureCategory } from '../../../../generated/prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class ListPropertyFeaturesQueryDto {
  @ApiPropertyOptional({ enum: PropertyFeatureCategory })
  @IsOptional()
  @IsEnum(PropertyFeatureCategory)
  category?: PropertyFeatureCategory;

  @ApiPropertyOptional({
    description: 'Filter by active status',
    type: Boolean,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    if (value === 'true' || value === true) {
      return true;
    }
    if (value === 'false' || value === false) {
      return false;
    }
    return undefined;
  })
  @IsBoolean()
  isActive?: boolean;
}
