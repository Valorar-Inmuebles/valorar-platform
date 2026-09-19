import { RentalContractStatus } from '../../../../generated/prisma/client';
import { IsEnum, IsOptional, IsString, Length } from 'class-validator';

export class ListRentalContractsQueryDto {
  @IsOptional()
  @IsEnum(RentalContractStatus)
  status?: RentalContractStatus;

  @IsOptional()
  @IsString()
  @Length(1, 80)
  search?: string;
}
