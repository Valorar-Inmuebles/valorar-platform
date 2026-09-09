import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RentalOccurrenceStatus } from '../../../../generated/prisma/client';
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-rental-obligation.dto';

export const OPERATIONAL_OCCURRENCE_STATUSES = [
  'PENDING',
  'OVERDUE',
  'FULFILLED',
  'CANCELLED',
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
}

export class UpdateRentalOccurrenceAmountDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount?: number | null;
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
