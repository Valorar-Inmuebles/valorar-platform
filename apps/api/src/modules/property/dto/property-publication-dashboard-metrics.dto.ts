export type PublicationDashboardMetrics = {
  publishedProperties: number;
  publishAlerts: {
    withoutCover: number;
    draftListingsWithPrice: number;
    activePropertiesWithoutActiveListing: number;
  };
};
