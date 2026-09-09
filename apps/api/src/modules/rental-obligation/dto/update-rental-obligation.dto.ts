import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateRentalObligationDto } from './create-rental-obligation.dto';

export class UpdateRentalObligationDto extends PartialType(
  OmitType(CreateRentalObligationDto, [
    'contractId',
    'oneTimeDueDate',
  ] as const),
) {}
