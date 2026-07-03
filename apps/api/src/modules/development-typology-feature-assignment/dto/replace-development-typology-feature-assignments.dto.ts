import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { AssignDevelopmentTypologyFeatureDto } from './assign-development-typology-feature.dto';

export class ReplaceDevelopmentTypologyFeatureAssignmentsDto {
  @ApiProperty({ type: AssignDevelopmentTypologyFeatureDto, isArray: true })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignDevelopmentTypologyFeatureDto)
  features: AssignDevelopmentTypologyFeatureDto[];
}
