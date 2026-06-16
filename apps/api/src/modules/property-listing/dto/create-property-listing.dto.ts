import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  PropertyListingType,
} from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePropertyListingDto {
  @ApiProperty({ description: 'Property identifier' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ enum: PropertyListingType })
  @IsEnum(PropertyListingType)
  listingType: PropertyListingType;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expensesAmount?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  expensesCurrency?: Currency;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
