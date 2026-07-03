import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ListDevelopmentImagesQueryDto {
  @ApiProperty({ description: 'Filter by development' })
  @IsString()
  @IsNotEmpty()
  developmentId: string;
}
