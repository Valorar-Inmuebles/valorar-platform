import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  PropertyListingStatus,
  PropertyListingType,
} from '../../../../generated/prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ListPropertyListingsQueryDto {
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
