import { RentalContractStatus } from '../../../../generated/prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class ListRentalContractsQueryDto {
  @IsOptional()
  @IsEnum(RentalContractStatus)
  status?: RentalContractStatus;
}
