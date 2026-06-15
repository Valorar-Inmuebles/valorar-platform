import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, PropertyPrice } from '../../../../generated/prisma/client';

export class PropertyPriceResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  listingId: string;

  @ApiProperty()
  amount: number;

  @ApiProperty({ enum: Currency })
  currency: Currency;

  @ApiProperty()
  isPrimary: boolean;

  @ApiPropertyOptional()
  label: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(price: PropertyPrice): PropertyPriceResponseDto {
    return {
      id: price.id,
      tenantId: price.tenantId,
      listingId: price.listingId,
      amount: Number(price.amount),
      currency: price.currency,
      isPrimary: price.isPrimary,
      label: price.label,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    };
  }
}
