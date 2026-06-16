import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePropertyPriceDto {
  @ApiProperty({ description: 'Property listing identifier' })
  @IsString()
  @IsNotEmpty()
  listingId: string;

  @ApiProperty({
    minimum: 0.01,
    description: 'Price amount (must be greater than 0)',
  })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ enum: Currency })
  @IsEnum(Currency)
  currency: Currency;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
