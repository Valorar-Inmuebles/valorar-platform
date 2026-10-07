/** Stable identifiers used by existing /propiedades?atencion= links. */
export type PropertyAttentionFilter =
  | 'without-images'
  | 'without-commercialization'
  | 'without-description'
  | 'without-features'
  | 'pending-publication'
  | 'without-price'
  | 'recently-archived';

export const PROPERTY_DESCRIPTION_MIN_LENGTH = 40;
export const PROPERTY_RECENTLY_ARCHIVED_DAYS = 30;

export type PropertyAttentionFacts = {
  isActive: boolean;
  updatedAt: Date;
  description: string | null;
  imageCount: number;
  listingCount: number;
  featureCount: number;
  isAnyPublishable: boolean;
  hasActiveListingWithoutPrimaryPrice: boolean;
};

/** Preserve the dashboard's calendar-day subtraction in the runtime timezone. */
export function propertyRecentlyArchivedThreshold(now: Date): Date {
  const threshold = new Date(now);
  threshold.setDate(threshold.getDate() - PROPERTY_RECENTLY_ARCHIVED_DAYS);
  return threshold;
}

/** updatedAt is an operational approximation, not an archive audit timestamp. */
export function isRecentlyArchivedProperty(
  property: Pick<PropertyAttentionFacts, 'isActive' | 'updatedAt'>,
  now: Date,
): boolean {
  return (
    !property.isActive &&
    property.updatedAt >= propertyRecentlyArchivedThreshold(now)
  );
}

/** Facts must already be tenant/visibility scoped by the caller. No I/O. */
export function evaluatePropertyAttention(
  facts: PropertyAttentionFacts,
  now: Date,
): Record<PropertyAttentionFilter, boolean> {
  return {
    'without-images': facts.isActive && facts.imageCount === 0,
    'without-commercialization': facts.isActive && facts.listingCount === 0,
    'without-description':
      facts.isActive &&
      (facts.description?.trim().length ?? 0) < PROPERTY_DESCRIPTION_MIN_LENGTH,
    'without-features': facts.isActive && facts.featureCount === 0,
    'pending-publication':
      facts.isActive && facts.listingCount > 0 && !facts.isAnyPublishable,
    'without-price':
      facts.isActive && facts.hasActiveListingWithoutPrimaryPrice,
    'recently-archived': isRecentlyArchivedProperty(facts, now),
  };
}
