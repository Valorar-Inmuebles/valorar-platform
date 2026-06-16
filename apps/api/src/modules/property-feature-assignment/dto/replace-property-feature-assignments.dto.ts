import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { AssignPropertyFeatureDto } from './assign-property-feature.dto';

export class ReplacePropertyFeatureAssignmentsDto {
  @ApiProperty({
    type: AssignPropertyFeatureDto,
    isArray: true,
    description: 'Full replacement set of feature assignments for the property',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssignPropertyFeatureDto)
  @ArrayUnique((item: AssignPropertyFeatureDto) => item.featureId, {
    message: 'Duplicate featureId in request',
  })
  features: AssignPropertyFeatureDto[];
}
