import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListPropertyImagesQueryDto {
  @ApiProperty({ description: 'Filter by property' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;
}
