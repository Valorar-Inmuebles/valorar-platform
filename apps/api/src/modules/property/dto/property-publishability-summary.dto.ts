import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export type PropertyCommercialStatusVariant =
  | 'published'
  | 'commercial-draft'
  | 'archived';

export class PropertyPublishabilitySummaryItemDto {
  @ApiProperty({ example: 'clx1234567890' })
  propertyId!: string;

  @ApiProperty({
    enum: ['published', 'commercial-draft', 'archived'],
    example: 'commercial-draft',
  })
  statusVariant!: PropertyCommercialStatusVariant;

  @ApiProperty({ example: false })
  isAnyPublishable!: boolean;

  @ApiPropertyOptional({
    example: 'https://example.com/propiedades/depto-centro?listingType=SALE',
    nullable: true,
  })
  publicUrl!: string | null;
}
