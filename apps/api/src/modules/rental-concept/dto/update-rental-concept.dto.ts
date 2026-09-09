import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRentalConceptDto {
  @ApiProperty()
  @IsBoolean()
  isActive: boolean;
}
