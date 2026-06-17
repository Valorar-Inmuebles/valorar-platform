import { ApiPropertyOptional } from '@nestjs/swagger';
import { PropertyFeatureCategory } from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  Min,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class UpdatePropertyFeatureDto {
  @ApiPropertyOptional({ example: 'Pileta climatizada' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ example: 'pileta-climatizada' })
  @IsOptional()
  @IsString()
  @Length(2, 120)
  @Matches(SLUG_PATTERN, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug?: string;

  @ApiPropertyOptional({ enum: PropertyFeatureCategory })
  @IsOptional()
  @IsEnum(PropertyFeatureCategory)
  category?: PropertyFeatureCategory;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
