import type { PropertyListingType } from "@repo/shared-types";
import type { PublicationCheckKey } from "@repo/property-rules";
import type { PropertyPublishabilityResponse } from "@/lib/api/types/property-publishability";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import type { PropertyStatusVariant } from "@/lib/property/navigation";
import { resolvePublicationCheckHref } from "@/lib/property/publication-check-keys";

export type PublishabilityCheckItem = {
  key: PublicationCheckKey;
  label: string;
  passed: boolean;
  message?: string;
  href?: string;
};

export type ListingPublishability = {
  listingId: string;
  listingType: PropertyListingType;
  listingTypeLabel: string;
  isPublishable: boolean;
  progress: number;
  items: PublishabilityCheckItem[];
  missing: PublicationCheckKey[];
  publicWebUrl: string | null;
};

export type PropertyPublishabilitySummary = {
  propertyId: string;
  slug: string;
  statusVariant: PropertyStatusVariant;
  isAnyPublishable: boolean;
  listings: ListingPublishability[];
};

export function getPublicWebBaseUrl(): string | null {
  const base =
    process.env.PUBLIC_WEB_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    null;

  return base && base.length > 0 ? base.replace(/\/$/, "") : null;
}

export function buildPublicPropertyUrl(
  slug: string,
  listingType?: PropertyListingType,
): string | null {
  const base = getPublicWebBaseUrl();

  if (!base) {
    return null;
  }

  const url = new URL(`/propiedades/${encodeURIComponent(slug)}`, `${base}/`);

  if (listingType) {
    url.searchParams.set("listingType", listingType);
  }

  return url.toString();
}

export function resolvePropertyStatusVariant(
  property: AdminProperty,
  isAnyPublishable: boolean,
): PropertyStatusVariant {
  if (!property.isActive) {
    return "archived";
  }

  return isAnyPublishable ? "published" : "commercial-draft";
}

export function mapApiPublishabilityToListing(
  property: AdminProperty,
  listing: AdminPropertyListing,
  api: PropertyPublishabilityResponse,
): ListingPublishability {
  const items: PublishabilityCheckItem[] = api.checks.map((check) => ({
    key: check.key,
    label: check.label,
    passed: check.passed,
    message: check.message,
    href: check.passed
      ? undefined
      : resolvePublicationCheckHref(check.key, property.id, listing.id),
  }));

  return {
    listingId: listing.id,
    listingType: listing.listingType,
    listingTypeLabel: getListingTypeLabel(listing.listingType),
    isPublishable: api.isPublishable,
    progress: api.progress,
    items,
    missing: api.missing,
    publicWebUrl: api.isPublishable
      ? buildPublicPropertyUrl(property.slug, listing.listingType)
      : null,
  };
}

export function buildPropertyPublishabilitySummary(
  property: AdminProperty,
  listings: AdminPropertyListing[],
  publishabilityByListingId: Record<string, ListingPublishability>,
): PropertyPublishabilitySummary {
  const listingPublishability = listings.map(
    (listing) =>
      publishabilityByListingId[listing.id] ??
      ({
        listingId: listing.id,
        listingType: listing.listingType,
        listingTypeLabel: getListingTypeLabel(listing.listingType),
        isPublishable: false,
        progress: 0,
        items: [],
        missing: [],
        publicWebUrl: null,
      } satisfies ListingPublishability),
  );

  const isAnyPublishable = listingPublishability.some(
    (listing) => listing.isPublishable,
  );

  return {
    propertyId: property.id,
    slug: property.slug,
    statusVariant: resolvePropertyStatusVariant(property, isAnyPublishable),
    isAnyPublishable,
    listings: listingPublishability,
  };
}
