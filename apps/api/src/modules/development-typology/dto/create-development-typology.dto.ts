import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency } from '../../../../generated/prisma/client';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'surfaceToGteSurfaceFromTypology', async: false })
class SurfaceToGteSurfaceFromConstraint
  implements ValidatorConstraintInterface
{
  validate(surfaceTo: number | undefined, args: ValidationArguments): boolean {
    if (surfaceTo === undefined || surfaceTo === null) {
      return true;
    }

    const object = args.object as CreateDevelopmentTypologyDto;
    if (object.surfaceFrom === undefined || object.surfaceFrom === null) {
      return true;
    }

    return surfaceTo >= object.surfaceFrom;
  }

  defaultMessage(): string {
    return 'surfaceTo must be greater than or equal to surfaceFrom';
  }
}

@ValidatorConstraint({ name: 'availableCountLteTotalCountTypology', async: false })
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

    const object = args.object as CreateDevelopmentTypologyDto;
    if (object.totalCount === undefined || object.totalCount === null) {
      return true;
    }

    return availableCount <= object.totalCount;
  }

  defaultMessage(): string {
    return 'availableCount must be less than or equal to totalCount';
  }
}

export class CreateDevelopmentTypologyDto {
  @ApiProperty({ description: 'Development identifier' })
  @IsString()
  @IsNotEmpty()
  developmentId: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Commercial description of the typology' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ minimum: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalCount?: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Validate(AvailableCountLteTotalCountConstraint)
  availableCount?: number;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  surfaceFrom?: number;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  @Validate(SurfaceToGteSurfaceFromConstraint)
  surfaceTo?: number;

  @ApiPropertyOptional({ minimum: 0.01 })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  priceFrom?: number;

  @ApiPropertyOptional({ enum: Currency })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
