import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, DevelopmentTypology } from '../../../../generated/prisma/client';

export class DevelopmentTypologyResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  developmentId: string;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiPropertyOptional()
  totalCount: number | null;

  @ApiPropertyOptional()
  availableCount: number | null;

  @ApiPropertyOptional()
  surfaceFrom: number | null;

  @ApiPropertyOptional()
  surfaceTo: number | null;

  @ApiPropertyOptional()
  priceFrom: number | null;

  @ApiPropertyOptional({ enum: Currency })
  currency: Currency | null;

  @ApiProperty()
  sortOrder: number;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(
    typology: DevelopmentTypology,
  ): DevelopmentTypologyResponseDto {
    return {
      id: typology.id,
      tenantId: typology.tenantId,
      developmentId: typology.developmentId,
      name: typology.name,
      description: typology.description,
      totalCount: typology.totalCount,
      availableCount: typology.availableCount,
      surfaceFrom:
        typology.surfaceFrom != null ? Number(typology.surfaceFrom) : null,
      surfaceTo:
        typology.surfaceTo != null ? Number(typology.surfaceTo) : null,
      priceFrom:
        typology.priceFrom != null ? Number(typology.priceFrom) : null,
      currency: typology.currency,
      sortOrder: typology.sortOrder,
      createdAt: typology.createdAt,
      updatedAt: typology.updatedAt,
    };
  }
}
