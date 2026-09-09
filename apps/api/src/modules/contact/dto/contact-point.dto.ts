import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { ContactPointType } from '../../../../generated/prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateContactPointDto {
  @ApiProperty({ enum: ContactPointType })
  @IsEnum(ContactPointType)
  type: ContactPointType;

  @ApiProperty({ example: 'contacto@example.com' })
  @IsString()
  @IsNotEmpty()
  @Length(3, 320)
  value: string;

  @ApiPropertyOptional({ example: 'Personal' })
  @IsOptional()
  @IsString()
  @Length(1, 80)
  label?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canReceiveSms?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  canReceiveWhatsapp?: boolean;
}

export class UpdateContactPointDto extends PartialType(
  OmitType(CreateContactPointDto, ['type'] as const),
) {}

export class ContactPointResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  contactId: string;

  @ApiProperty({ enum: ContactPointType })
  type: ContactPointType;

  @ApiProperty()
  value: string;

  @ApiProperty()
  normalizedValue: string;

  @ApiPropertyOptional({ nullable: true })
  label: string | null;

  @ApiProperty()
  isDefault: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  canReceiveSms: boolean;

  @ApiProperty()
  canReceiveWhatsapp: boolean;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
