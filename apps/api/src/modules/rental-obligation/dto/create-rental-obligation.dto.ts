import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  RentalAmountMode,
  RentalDueMode,
  RentalObligationKind,
} from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

export const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export class CreateRentalObligationDto {
  @ApiProperty()
  @IsString()
  contractId: string;

  @ApiProperty()
  @IsString()
  conceptId: string;

  @ApiProperty({ enum: RentalObligationKind })
  @IsEnum(RentalObligationKind)
  kind: RentalObligationKind;

  @ApiPropertyOptional({ minimum: 1, maximum: 12 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  recurrenceMonths?: number | null;

  @ApiPropertyOptional({
    enum: RentalDueMode,
    default: RentalDueMode.FIXED_DAY,
  })
  @IsOptional()
  @IsEnum(RentalDueMode)
  dueMode?: RentalDueMode;

  @ApiPropertyOptional({ minimum: 1, maximum: 31 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(31)
  dueDay?: number | null;

  @ApiProperty({ enum: RentalAmountMode })
  @IsEnum(RentalAmountMode)
  amountMode: RentalAmountMode;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  defaultAmount?: number | null;

  @ApiPropertyOptional({ minimum: 1, maximum: 12, nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  adjustmentIntervalMonths?: number | null;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  includeInNotice?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  showAmount?: boolean;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiProperty({ format: 'date' })
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  startsOn: string;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  endsOn?: string | null;

  @ApiPropertyOptional({ format: 'date', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(DATE_ONLY_PATTERN)
  oneTimeDueDate?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
