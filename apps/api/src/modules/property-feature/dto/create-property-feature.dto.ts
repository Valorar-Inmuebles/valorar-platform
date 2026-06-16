import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class CreatePropertyFeatureDto {
  @ApiProperty({ example: 'Pileta' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    example: 'pileta',
    description: 'URL-friendly slug unique platform-wide',
  })
  @IsString()
  @Length(2, 120)
  @Matches(SLUG_PATTERN, {
    message: 'slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ enum: PropertyFeatureCategory })
  @IsEnum(PropertyFeatureCategory)
  category: PropertyFeatureCategory;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
