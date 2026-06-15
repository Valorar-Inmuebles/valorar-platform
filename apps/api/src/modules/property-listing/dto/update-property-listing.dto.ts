import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  PropertyListingStatus,
} from '../../../../generated/prisma/client';
import { IsBoolean, IsEnum, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdatePropertyListingDto {
  @ApiPropertyOptional({ enum: PropertyListingStatus })
  @IsOptional()
  @IsEnum(PropertyListingStatus)
  status?: PropertyListingStatus;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  expensesAmount?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  expensesCurrency?: Currency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;
}
