import { OmitType, PartialType } from '@nestjs/swagger';
import { CreatePropertyDto } from './create-property.dto';

export class UpdatePropertyDto extends PartialType(
  OmitType(CreatePropertyDto, ['tenantId', 'createdById'] as const),
) {}
