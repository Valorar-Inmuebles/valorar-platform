import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  RentalConcept,
  RentalConceptSystemCode,
} from '../../../../generated/prisma/client';

export class RentalConceptResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  slug: string;

  @ApiPropertyOptional({ enum: RentalConceptSystemCode, nullable: true })
  systemCode: RentalConceptSystemCode | null;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(concept: RentalConcept): RentalConceptResponseDto {
    return concept;
  }
}
