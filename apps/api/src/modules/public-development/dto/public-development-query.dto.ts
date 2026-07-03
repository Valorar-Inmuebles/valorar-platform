import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  DevelopmentStatus,
} from '../../../../generated/prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class PublicDevelopmentTenantQueryDto {
  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ListPublicDevelopmentsQueryDto extends PublicDevelopmentTenantQueryDto {
  @ApiPropertyOptional({ description: 'Geo catalog province ID' })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional({ description: 'Geo catalog locality ID' })
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiPropertyOptional({ description: 'Geo catalog neighborhood ID' })
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMin?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  priceMax?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ enum: DevelopmentStatus })
  @IsOptional()
  @IsEnum(DevelopmentStatus)
  status?: DevelopmentStatus;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class PublicDevelopmentSlugQueryDto extends PublicDevelopmentTenantQueryDto {}
