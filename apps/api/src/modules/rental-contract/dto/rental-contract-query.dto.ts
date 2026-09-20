import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
import {
  RentalContractEventType,
  RentalContractStatus,
  RentalContractPartyRole,
} from '../../../../generated/prisma/client';
import { DATE_ONLY_PATTERN } from '../../rental-obligation/dto/create-rental-obligation.dto';
import { Matches } from 'class-validator';

export const RENTAL_CONTRACT_SORT_FIELDS = [
  'internalNumber',
  'startsOn',
  'endsOn',
  'status',
  'propertyAddress',
  'createdAt',
] as const;

export class ListRentalContractsQueryDto {
  @ApiPropertyOptional({ enum: RentalContractStatus })
  @IsOptional()
  @IsEnum(RentalContractStatus)
  status?: RentalContractStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  search?: string;

  @ApiPropertyOptional({
    description: 'Contracts ending on or before this date',
  })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  endingBefore?: string;

  @ApiPropertyOptional({
    description: 'Derived expiring-soon window from the tenant local date',
    minimum: 1,
    maximum: 365,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  endingWithinDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  countryId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  localityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  neighborhoodId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  partyContactId?: string;

  @ApiPropertyOptional({ enum: RentalContractPartyRole })
  @IsOptional()
  @IsEnum(RentalContractPartyRole)
  partyRole?: RentalContractPartyRole;

  @ApiPropertyOptional({ enum: RENTAL_CONTRACT_SORT_FIELDS })
  @IsOptional()
  @IsIn(RENTAL_CONTRACT_SORT_FIELDS)
  sortBy?: (typeof RENTAL_CONTRACT_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}

export class RentalContractHistoryQueryDto {
  @ApiPropertyOptional({ enum: RentalContractEventType })
  @IsOptional()
  @IsEnum(RentalContractEventType)
  type?: RentalContractEventType;

  @ApiPropertyOptional({ enum: ['CONTRACT', 'FULFILLMENT'] })
  @IsOptional()
  @IsIn(['CONTRACT', 'FULFILLMENT'])
  category?: 'CONTRACT' | 'FULFILLMENT';

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  from?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;
}
