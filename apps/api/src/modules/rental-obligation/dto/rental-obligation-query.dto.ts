import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class ListRentalObligationsQueryDto {
  @ApiProperty()
  @IsString()
  contractId: string;
}
