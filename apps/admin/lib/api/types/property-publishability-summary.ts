import type { PropertyStatusVariant } from "@/lib/property/navigation";

export type PropertyPublishabilitySummaryItem = {
  propertyId: string;
  statusVariant: PropertyStatusVariant;
  isAnyPublishable: boolean;
  publicUrl: string | null;
};

export type PropertyPublishabilitySummaryById = Record<
  string,
  PropertyPublishabilitySummaryItem
>;
