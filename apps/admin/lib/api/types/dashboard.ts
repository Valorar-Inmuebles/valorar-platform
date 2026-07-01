export type DashboardKpis = {
  totalProperties: number;
  published: number;
  drafts: number;
  archived: number;
};

export type DashboardCatalogHealth = {
  withoutImages: number;
  withoutCommercialization: number;
  withoutDescription: number;
  withoutFeatures: number;
  pendingPublication: number;
};

export type DashboardAttentionAlerts = {
  withoutImages: number;
  withoutPrice: number;
  withoutDescription: number;
  withoutCommercialization: number;
  recentlyArchived: number;
};

export type DashboardAttentionFilter =
  | "without-images"
  | "without-commercialization"
  | "without-description"
  | "without-features"
  | "pending-publication"
  | "without-price"
  | "recently-archived";

export type DashboardFilterSets = Record<DashboardAttentionFilter, string[]>;

export type DashboardActivityType =
  | "property_created"
  | "property_updated"
  | "listing_published"
  | "listing_created"
  | "images_added"
  | "property_archived";

export type DashboardActivityItem = {
  id: string;
  type: DashboardActivityType;
  timestamp: string;
  propertyId: string;
  propertyTitle: string;
  actorName: string | null;
  label: string;
  detail: string | null;
};

export type DashboardSummary = {
  kpis: DashboardKpis;
  catalogHealth: DashboardCatalogHealth;
  attentionAlerts: DashboardAttentionAlerts;
  filterSets: DashboardFilterSets;
  recentActivity: DashboardActivityItem[];
};

/** @deprecated Use DashboardKpis fields directly */
export type LegacyDashboardKpis = {
  totalActiveProperties: number;
  publishedProperties: number;
  activeSaleListings: number;
  activeRentListings: number;
  featuredListings: number;
};

/** @deprecated Use DashboardAttentionAlerts */
export type DashboardPublishAlerts = {
  withoutCover: number;
  draftListingsWithPrice: number;
  activePropertiesWithoutActiveListing: number;
};
