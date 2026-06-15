import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyListingStatus,
  PropertyListingType,
} from '../../../../generated/prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class PropertyListingTenantQueryDto {
  @ApiProperty({ description: 'Tenant identifier' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;
}

export class ListPropertyListingsQueryDto extends PropertyListingTenantQueryDto {
  @ApiPropertyOptional({ description: 'Filter by property' })
  @IsOptional()
  @IsString()
  propertyId?: string;

  @ApiPropertyOptional({ enum: PropertyListingType })
  @IsOptional()
  @IsEnum(PropertyListingType)
  listingType?: PropertyListingType;

  @ApiPropertyOptional({ enum: PropertyListingStatus })
  @IsOptional()
  @IsEnum(PropertyListingStatus)
  status?: PropertyListingStatus;
}
