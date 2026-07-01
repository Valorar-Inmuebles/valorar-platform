import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({ example: 42, description: 'Total properties in tenant' })
  totalProperties!: number;

  @ApiProperty({ example: 18, description: 'Active properties visible on public web' })
  published!: number;

  @ApiProperty({ example: 12, description: 'Active properties not yet publishable' })
  drafts!: number;

  @ApiProperty({ example: 5, description: 'Archived properties' })
  archived!: number;
}

export class DashboardCatalogHealthDto {
  @ApiProperty({ example: 4 })
  withoutImages!: number;

  @ApiProperty({ example: 3 })
  withoutCommercialization!: number;

  @ApiProperty({ example: 6 })
  withoutDescription!: number;

  @ApiProperty({ example: 8 })
  withoutFeatures!: number;

  @ApiProperty({ example: 7 })
  pendingPublication!: number;
}

export class DashboardAttentionAlertsDto {
  @ApiProperty({ example: 4 })
  withoutImages!: number;

  @ApiProperty({ example: 2 })
  withoutPrice!: number;

  @ApiProperty({ example: 6 })
  withoutDescription!: number;

  @ApiProperty({ example: 3 })
  withoutCommercialization!: number;

  @ApiProperty({ example: 1 })
  recentlyArchived!: number;
}

export class DashboardFilterSetsDto {
  @ApiProperty({ type: [String] })
  withoutImages!: string[];

  @ApiProperty({ type: [String] })
  withoutCommercialization!: string[];

  @ApiProperty({ type: [String] })
  withoutDescription!: string[];

  @ApiProperty({ type: [String] })
  withoutFeatures!: string[];

  @ApiProperty({ type: [String] })
  pendingPublication!: string[];

  @ApiProperty({ type: [String] })
  withoutPrice!: string[];

  @ApiProperty({ type: [String] })
  recentlyArchived!: string[];
}

export class DashboardActivityItemDto {
  @ApiProperty({ example: 'activity-1' })
  id!: string;

  @ApiProperty({
    enum: [
      'property_created',
      'property_updated',
      'listing_published',
      'listing_created',
      'images_added',
      'property_archived',
    ],
  })
  type!:
    | 'property_created'
    | 'property_updated'
    | 'listing_published'
    | 'listing_created'
    | 'images_added'
    | 'property_archived';

  @ApiProperty({ example: '2026-07-01T12:00:00.000Z' })
  timestamp!: string;

  @ApiProperty({ example: 'clx1234567890' })
  propertyId!: string;

  @ApiProperty({ example: 'Casa en Palermo' })
  propertyTitle!: string;

  @ApiPropertyOptional({ example: 'Juan Pérez', nullable: true })
  actorName!: string | null;

  @ApiProperty({ example: 'Nueva propiedad' })
  label!: string;

  @ApiPropertyOptional({ example: 'Venta', nullable: true })
  detail!: string | null;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: DashboardCatalogHealthDto })
  catalogHealth!: DashboardCatalogHealthDto;

  @ApiProperty({ type: DashboardAttentionAlertsDto })
  attentionAlerts!: DashboardAttentionAlertsDto;

  @ApiProperty({ type: DashboardFilterSetsDto })
  filterSets!: DashboardFilterSetsDto;

  @ApiProperty({ type: [DashboardActivityItemDto] })
  recentActivity!: DashboardActivityItemDto[];
}
