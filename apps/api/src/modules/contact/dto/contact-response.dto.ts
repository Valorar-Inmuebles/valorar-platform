import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContactDocumentType } from '../../../../generated/prisma/client';
import type { ContactRecord } from '../repositories/contact.repository';
import { ContactPointResponseDto } from './contact-point.dto';

export class ContactResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiPropertyOptional({ enum: ContactDocumentType, nullable: true })
  documentType: ContactDocumentType | null;

  @ApiPropertyOptional({ nullable: true })
  documentNumber: string | null;

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
      documentType: contact.documentType,
      documentNumber: contact.documentNumber,
      notes: contact.notes,
      isActive: contact.isActive,
      contactPoints: contact.contactPoints,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
    };
  }
}
