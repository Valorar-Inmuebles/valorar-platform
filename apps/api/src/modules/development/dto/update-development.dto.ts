import { OmitType, PartialType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, DevelopmentStatus } from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';
import { CreateDevelopmentDto } from './create-development.dto';

export class UpdateDevelopmentDto extends PartialType(
  OmitType(CreateDevelopmentDto, ['status'] as const),
) {
  @ApiPropertyOptional({ nullable: true, enum: DevelopmentStatus })
  @IsOptional()
  @IsEnum(DevelopmentStatus)
  status?: DevelopmentStatus | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceFrom?: number | null;

  @ApiPropertyOptional({ enum: Currency, nullable: true })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasFinancing?: boolean;

  @ApiPropertyOptional({ nullable: true })
  @ValidateIf((dto: UpdateDevelopmentDto) => dto.hasFinancing === true)
  @IsOptional()
  @IsString()
  financingDescription?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasParkingSpaces?: boolean;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @ValidateIf((dto: UpdateDevelopmentDto) => dto.hasParkingSpaces === true)
  @IsOptional()
  @IsNumber()
  @Min(1)
  parkingSpacesCount?: number | null;
}
