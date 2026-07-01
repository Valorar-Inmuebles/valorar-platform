import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class SearchLocalitiesQueryDto {
  @ApiProperty({ description: 'Search term (name or normalized search field)' })
  @IsString()
  q: string;

  @ApiPropertyOptional({ description: 'Restrict to a province' })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 20;
}

export class LocalitySearchResultDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  provinceId: string;

  @ApiProperty()
  provinceName: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional()
  postalCode: string | null;
}

export class SearchLocalitiesQueryDtoForProvince {
  @ApiPropertyOptional({ description: 'Filter localities by search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}

export class SearchNeighborhoodsQueryDto {
  @ApiPropertyOptional({ description: 'Filter neighborhoods by search term' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50;
}
