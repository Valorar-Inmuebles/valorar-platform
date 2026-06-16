import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListPropertyPricesQueryDto {
  @ApiProperty({ description: 'Filter by property listing' })
  @IsString()
  @IsNotEmpty()
  listingId: string;
}
