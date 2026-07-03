import { ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'surfaceToGteSurfaceFromTypologyUpdate', async: false })
class SurfaceToGteSurfaceFromConstraint
  implements ValidatorConstraintInterface
{
  validate(surfaceTo: number | undefined, args: ValidationArguments): boolean {
    if (surfaceTo === undefined || surfaceTo === null) {
      return true;
    }

    const object = args.object as UpdateDevelopmentTypologyDto;
    if (object.surfaceFrom === undefined || object.surfaceFrom === null) {
      return true;
    }

    return surfaceTo >= object.surfaceFrom;
  }

  defaultMessage(): string {
    return 'surfaceTo must be greater than or equal to surfaceFrom';
  }
}

@ValidatorConstraint({ name: 'availableCountLteTotalCountTypologyUpdate', async: false })
class AvailableCountLteTotalCountConstraint
  implements ValidatorConstraintInterface
{
  validate(
    availableCount: number | undefined,
    args: ValidationArguments,
  ): boolean {
    if (availableCount === undefined || availableCount === null) {
      return true;
    }

    const object = args.object as UpdateDevelopmentTypologyDto;
    if (object.totalCount === undefined || object.totalCount === null) {
      return true;
    }

    return availableCount <= object.totalCount;
  }

  defaultMessage(): string {
    return 'availableCount must be less than or equal to totalCount';
  }
}

export class UpdateDevelopmentTypologyDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ nullable: true, minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCount?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Validate(AvailableCountLteTotalCountConstraint)
  availableCount?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  surfaceFrom?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Validate(SurfaceToGteSurfaceFromConstraint)
  surfaceTo?: number | null;

  @ApiPropertyOptional({ nullable: true, minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  priceFrom?: number | null;

  @ApiPropertyOptional({ nullable: true, enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency | null;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
