import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignPropertyFeatureDto {
  @ApiProperty({ description: 'Global property feature identifier' })
  @IsString()
  @IsNotEmpty()
  featureId: string;

  @ApiPropertyOptional({
    description: 'Optional detail for this assignment',
    example: '2 cocheras cubiertas',
  })
  @IsOptional()
  @IsString()
  value?: string;
}
