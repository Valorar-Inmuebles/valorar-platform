import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalOccurrenceStatus } from '../../../../generated/prisma/client';
import {
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DATE_ONLY_PATTERN } from './create-rental-obligation.dto';

export const OPERATIONAL_OCCURRENCE_STATUSES = [
  'PENDING',
  'OVERDUE',
  'FULFILLED',
  'CANCELLED',
] as const;
export const RENTAL_OCCURRENCE_CATEGORIES = [
  'ALL',
  'RENT',
  'OTHER',
  'OVERDUE',
] as const;
export const RENTAL_OCCURRENCE_SORT_FIELDS = [
  'dueDate',
  'internalNumber',
  'concept',
  'amount',
  'status',
] as const;

export class ListRentalOccurrencesQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contractId?: string;

  @ApiPropertyOptional({ enum: OPERATIONAL_OCCURRENCE_STATUSES })
  @IsOptional()
  @IsIn(OPERATIONAL_OCCURRENCE_STATUSES)
  status?: (typeof OPERATIONAL_OCCURRENCE_STATUSES)[number];

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  dueFrom?: string;

  @ApiPropertyOptional({ format: 'date' })
  @IsOptional()
  @Matches(DATE_ONLY_PATTERN)
  dueTo?: string;

  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/)
  month?: string;

  @ApiPropertyOptional({ enum: RENTAL_OCCURRENCE_CATEGORIES })
  @IsOptional()
  @IsIn(RENTAL_OCCURRENCE_CATEGORIES)
  category?: (typeof RENTAL_OCCURRENCE_CATEGORIES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  conceptId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(1, 160)
  search?: string;

  @ApiPropertyOptional({ enum: RENTAL_OCCURRENCE_SORT_FIELDS })
  @IsOptional()
  @IsIn(RENTAL_OCCURRENCE_SORT_FIELDS)
  sortBy?: (typeof RENTAL_OCCURRENCE_SORT_FIELDS)[number];

  @ApiPropertyOptional({ enum: ['asc', 'desc'] })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

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

export class UpdateRentalOccurrenceAmountDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number | null;
}

export class UpdateRentalOccurrenceDueDateDto {
  @ApiProperty({ format: 'date' })
  @Matches(DATE_ONLY_PATTERN)
  dueDate: string;
}

export class CancelRentalOccurrenceDto {
  @ApiProperty()
  @IsString()
  @Length(1, 500)
  reason: string;
}

export class RecordRentalFulfillmentDto {
  @ApiProperty({ format: 'date' })
  @Matches(DATE_ONLY_PATTERN)
  fulfilledOn: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  notes?: string | null;
}

export class ReverseRentalFulfillmentDto {
  @ApiProperty()
  @IsString()
  @Length(1, 500)
  reason: string;
}

export type PersistedOccurrenceStatus = RentalOccurrenceStatus;
