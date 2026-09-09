import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ContactRecord } from '../repositories/contact.repository';
import { ContactPointResponseDto } from './contact-point.dto';

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ nullable: true })
  notes: string | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: ContactPointResponseDto, isArray: true })
  contactPoints: ContactPointResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(contact: ContactRecord): ContactResponseDto {
    return {
      id: contact.id,
      tenantId: contact.tenantId,
      name: contact.name,
      notes: contact.notes,
      isActive: contact.isActive,
      contactPoints: contact.contactPoints,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
