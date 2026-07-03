import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDevelopmentImageUploadUrlDto {
  @ApiProperty({ description: 'Development identifier' })
  @IsString()
  @IsNotEmpty()
  developmentId: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiPropertyOptional({ example: 'hero.jpg' })
  @IsOptional()
  @IsString()
  filename?: string;
}
