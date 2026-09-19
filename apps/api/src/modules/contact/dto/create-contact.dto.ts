import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  ValidateNested,
} from 'class-validator';
import { CreateContactPointDto } from './contact-point.dto';

export class CreateContactDto {
  @ApiProperty({ example: 'María Pérez' })
  @IsString()
  @IsNotEmpty()
  @Length(1, 160)
  name: string;

  @ApiPropertyOptional({ example: 'DNI' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  documentType?: string;

  @ApiPropertyOptional({ example: '30123456' })
  @IsOptional()
  @IsString()
  @Length(1, 40)
  documentNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Length(0, 4000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: CreateContactPointDto, isArray: true })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateContactPointDto)
  contactPoints?: CreateContactPointDto[];
}
