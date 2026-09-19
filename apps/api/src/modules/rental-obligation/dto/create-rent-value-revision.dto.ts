import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Length,
  Matches,
} from 'class-validator';
import { DATE_ONLY_PATTERN } from './create-rental-obligation.dto';

export class CreateRentValueRevisionDto {
  @ApiProperty({ format: 'date' })
  @Matches(DATE_ONLY_PATTERN)
  effectiveFrom: string;

  @ApiProperty()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @Length(1, 1000)
  reason?: string | null;
}
