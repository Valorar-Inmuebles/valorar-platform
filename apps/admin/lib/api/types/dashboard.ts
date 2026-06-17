export type DashboardKpis = {
  totalActiveProperties: number;
  publishedProperties: number;
  activeSaleListings: number;
  activeRentListings: number;
  featuredListings: number;
};

export type DashboardPublishAlerts = {
  withoutCover: number;
  draftListingsWithPrice: number;
  activePropertiesWithoutActiveListing: number;
};

export type DashboardSummary = {
  kpis: DashboardKpis;
  publishAlerts: DashboardPublishAlerts;
};
