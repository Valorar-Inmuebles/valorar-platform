import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AssignDevelopmentFeatureDto {
  @ApiProperty({ description: 'Global property feature identifier' })
  @IsString()
  @IsNotEmpty()
  featureId: string;

  @ApiPropertyOptional({
    description: 'Optional detail for this assignment',
    example: 'Piscina climatizada',
  })
  @IsOptional()
  @IsString()
  value?: string;
}
