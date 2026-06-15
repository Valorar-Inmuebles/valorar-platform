import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  Currency,
  PropertyListing,
  PropertyListingStatus,
  PropertyListingType,
} from '../../../../generated/prisma/client';

export class PropertyListingResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  tenantId: string;

  @ApiProperty()
  propertyId: string;

  @ApiProperty({ enum: PropertyListingType })
  listingType: PropertyListingType;

  @ApiProperty({ enum: PropertyListingStatus })
  status: PropertyListingStatus;

  @ApiPropertyOptional()
  expensesAmount: number | null;

  @ApiPropertyOptional({ enum: Currency })
  expensesCurrency: Currency | null;

  @ApiProperty()
  isFeatured: boolean;

  @ApiPropertyOptional()
  publishedAt: Date | null;

  @ApiPropertyOptional()
  closedAt: Date | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static fromEntity(listing: PropertyListing): PropertyListingResponseDto {
    return {
      id: listing.id,
      tenantId: listing.tenantId,
      propertyId: listing.propertyId,
      listingType: listing.listingType,
      status: listing.status,
      expensesAmount:
        listing.expensesAmount != null ? Number(listing.expensesAmount) : null,
      expensesCurrency: listing.expensesCurrency,
      isFeatured: listing.isFeatured,
      publishedAt: listing.publishedAt,
      closedAt: listing.closedAt,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
    };
  }
}
