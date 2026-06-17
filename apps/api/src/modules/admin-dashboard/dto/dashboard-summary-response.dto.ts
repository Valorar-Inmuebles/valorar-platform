import { ApiProperty } from '@nestjs/swagger';

export class DashboardKpisDto {
  @ApiProperty({ example: 42 })
  totalActiveProperties!: number;

  @ApiProperty({ example: 18 })
  publishedProperties!: number;

  @ApiProperty({ example: 12 })
  activeSaleListings!: number;

  @ApiProperty({ example: 8 })
  activeRentListings!: number;

  @ApiProperty({ example: 3 })
  featuredListings!: number;
}

export class DashboardPublishAlertsDto {
  @ApiProperty({ example: 5 })
  withoutCover!: number;

  @ApiProperty({ example: 3 })
  draftListingsWithPrice!: number;

  @ApiProperty({ example: 2 })
  activePropertiesWithoutActiveListing!: number;
}

export class DashboardSummaryResponseDto {
  @ApiProperty({ type: DashboardKpisDto })
  kpis!: DashboardKpisDto;

  @ApiProperty({ type: DashboardPublishAlertsDto })
  publishAlerts!: DashboardPublishAlertsDto;
}
