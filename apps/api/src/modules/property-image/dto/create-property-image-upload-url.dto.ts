import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePropertyImageUploadUrlDto {
  @ApiProperty({ description: 'Property identifier' })
  @IsString()
  @IsNotEmpty()
  propertyId: string;

  @ApiProperty({ example: 'image/jpeg' })
  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @ApiPropertyOptional({ example: 'living-room.jpg' })
  @IsOptional()
  @IsString()
  filename?: string;
}
