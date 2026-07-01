import type { PropertyListingType } from "@repo/shared-types";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import { summarizeListingPrices } from "@/lib/property/commercialization";
import type { PropertyPublishabilitySummary } from "@/lib/property/publishability";

const LISTING_TYPE_PRIORITY: PropertyListingType[] = [
  "SALE",
  "RENT",
  "TEMPORARY_RENT",
];

export type PropertyPrimaryPriceSummary = {
  amount: number;
  currency: string;
  listingType: PropertyListingType;
  listingTypeLabel: string;
};

export type PropertySeoSummary = {
  scoreLabel: string;
  isReady: boolean;
  issues: string[];
};

export type PropertyExecutiveSnapshot = {
  shortAddress: string;
  provinceLabel: string;
  localityLabel: string;
  lifecycleLabel: "Activa" | "Archivada";
  commercialLabel: "Publicada" | "Borrador";
  activeOperationsCount: number;
  activeOperationLabels: string[];
  primaryPrice: PropertyPrimaryPriceSummary | null;
  isFeatured: boolean;
  imageCount: number;
  hasCoverImage: boolean;
  featureCount: number;
  seo: PropertySeoSummary;
  updatedAt: string;
};

export function formatPropertyShortAddress(property: AdminProperty): string {
  const streetLine = [property.street, property.streetNumber]
    .filter(Boolean)
    .join(" ");

  if (streetLine) {
    return streetLine;
  }

  return property.neighborhoodName ?? property.neighborhood ?? property.city;
}

export function resolveProvinceLabel(property: AdminProperty): string {
  return property.provinceName ?? property.province ?? "—";
}

export function resolveLocalityLabel(property: AdminProperty): string {
  return property.localityName ?? property.city ?? "—";
}

export function resolvePrimaryPriceSummary(
  listings: AdminPropertyListing[],
  pricesByListingId: Record<string, AdminPropertyPrice[]>,
): PropertyPrimaryPriceSummary | null {
  const activeListings = listings.filter((listing) => listing.status === "ACTIVE");

  for (const listingType of LISTING_TYPE_PRIORITY) {
    const listing = activeListings.find(
      (entry) => entry.listingType === listingType,
    );

    if (!listing) continue;

    const summary = summarizeListingPrices(pricesByListingId[listing.id] ?? []);
    if (!summary.primary) continue;

    return {
      amount: summary.primary.amount,
      currency: summary.primary.currency,
      listingType: listing.listingType,
      listingTypeLabel: getListingTypeLabel(listing.listingType),
    };
  }

  for (const listing of listings) {
    const summary = summarizeListingPrices(pricesByListingId[listing.id] ?? []);
    if (!summary.primary) continue;

    return {
      amount: summary.primary.amount,
      currency: summary.primary.currency,
      listingType: listing.listingType,
      listingTypeLabel: getListingTypeLabel(listing.listingType),
    };
  }

  return null;
}

export function evaluatePropertySeo(property: AdminProperty): PropertySeoSummary {
  const issues: string[] = [];

  if (!property.slug.trim()) {
    issues.push("Falta slug");
  }

  if (!property.title.trim()) {
    issues.push("Falta título");
  }

  const description = property.description?.trim() ?? "";
  if (description.length < 40) {
    issues.push("Descripción corta para SEO");
  }

  const isReady = issues.length === 0;

  return {
    isReady,
    scoreLabel: isReady ? "Listo" : `${issues.length} pendiente${issues.length === 1 ? "" : "s"}`,
    issues,
  };
}

export function buildPropertyExecutiveSnapshot(input: {
  property: AdminProperty;
  publishability: PropertyPublishabilitySummary;
  listings: AdminPropertyListing[];
  pricesByListingId: Record<string, AdminPropertyPrice[]>;
  imageCount: number;
  hasCoverImage: boolean;
  featureCount: number;
}): PropertyExecutiveSnapshot {
  const activeListings = input.listings.filter(
    (listing) => listing.status === "ACTIVE",
  );

  return {
    shortAddress: formatPropertyShortAddress(input.property),
    provinceLabel: resolveProvinceLabel(input.property),
    localityLabel: resolveLocalityLabel(input.property),
    lifecycleLabel: input.property.isActive ? "Activa" : "Archivada",
    commercialLabel: input.publishability.isAnyPublishable
      ? "Publicada"
      : "Borrador",
    activeOperationsCount: activeListings.length,
    activeOperationLabels: activeListings.map((listing) =>
      getListingTypeLabel(listing.listingType),
    ),
    primaryPrice: resolvePrimaryPriceSummary(
      input.listings,
      input.pricesByListingId,
    ),
    isFeatured: input.listings.some((listing) => listing.isFeatured),
    imageCount: input.imageCount,
    hasCoverImage: input.hasCoverImage,
    featureCount: input.featureCount,
    seo: evaluatePropertySeo(input.property),
    updatedAt: input.property.updatedAt,
  };
}
