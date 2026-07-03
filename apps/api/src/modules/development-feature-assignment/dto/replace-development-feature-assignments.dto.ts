import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { AssignDevelopmentFeatureDto } from './assign-development-feature.dto';

export class ReplaceDevelopmentFeatureAssignmentsDto {
  @ApiProperty({
    type: AssignDevelopmentFeatureDto,
    isArray: true,
    description:
      'Full replacement set of feature assignments for the development',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignDevelopmentFeatureDto)
  @ArrayUnique((item: AssignDevelopmentFeatureDto) => item.featureId, {
    message: 'Duplicate featureId in request',
  })
  features: AssignDevelopmentFeatureDto[];
}
