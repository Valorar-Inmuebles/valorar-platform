import type { PropertyListingType } from "@repo/shared-types";
import type { AdminProperty } from "@/lib/api/types/property";
import type { AdminPropertyImage } from "@/lib/api/types/property-image";
import type { AdminPropertyListing } from "@/lib/api/types/property-listing";
import type { AdminPropertyPrice } from "@/lib/api/types/property-price";
import { getListingTypeLabel } from "@/lib/format/listing-labels";
import type { PropertyStatusVariant } from "@/lib/property/navigation";

export type PublishabilityRequirement =
  | "property-active"
  | "listing-active"
  | "primary-price"
  | "cover-image";

export type PublishabilityCheckItem = {
  id: PublishabilityRequirement;
  label: string;
  met: boolean;
  href?: string;
};

export type ListingPublishability = {
  listingId: string;
  listingType: PropertyListingType;
  listingTypeLabel: string;
  isPublishable: boolean;
  items: PublishabilityCheckItem[];
  publicWebUrl: string | null;
};

export type PropertyPublishabilitySummary = {
  propertyId: string;
  slug: string;
  statusVariant: PropertyStatusVariant;
  isAnyPublishable: boolean;
  hasCoverImage: boolean;
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

function hasPrimaryPrice(prices: AdminPropertyPrice[]): boolean {
  return prices.some((price) => price.isPrimary);
}

function hasCoverImage(images: AdminPropertyImage[]): boolean {
  return images.some((image) => image.isCover);
}

function buildListingChecklist(
  property: AdminProperty,
  listing: AdminPropertyListing,
  prices: AdminPropertyPrice[],
  images: AdminPropertyImage[],
): PublishabilityCheckItem[] {
  const propertyId = property.id;

  return [
    {
      id: "property-active",
      label: "Propiedad activa",
      met: property.isActive,
      href: property.isActive ? undefined : `/propiedades/${propertyId}`,
    },
    {
      id: "listing-active",
      label: `Publicación ${getListingTypeLabel(listing.listingType)} activa`,
      met: listing.status === "ACTIVE",
      href:
        listing.status === "ACTIVE"
          ? undefined
          : `/propiedades/${propertyId}/publicaciones/${listing.id}`,
    },
    {
      id: "primary-price",
      label: "Precio principal definido",
      met: hasPrimaryPrice(prices),
      href: hasPrimaryPrice(prices)
        ? undefined
        : `/propiedades/${propertyId}/publicaciones/${listing.id}/precios`,
    },
    {
      id: "cover-image",
      label: "Imagen portada definida",
      met: hasCoverImage(images),
      href: hasCoverImage(images)
        ? undefined
        : `/propiedades/${propertyId}/imagenes`,
    },
  ];
}

export function evaluateListingPublishability(
  property: AdminProperty,
  listing: AdminPropertyListing,
  prices: AdminPropertyPrice[],
  images: AdminPropertyImage[],
): ListingPublishability {
  const items = buildListingChecklist(property, listing, prices, images);
  const isPublishable = items.every((item) => item.met);

  return {
    listingId: listing.id,
    listingType: listing.listingType,
    listingTypeLabel: getListingTypeLabel(listing.listingType),
    isPublishable,
    items,
    publicWebUrl: isPublishable
      ? buildPublicPropertyUrl(property.slug, listing.listingType)
      : null,
  };
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

export function buildPropertyPublishabilitySummary(
  property: AdminProperty,
  listings: AdminPropertyListing[],
  pricesByListingId: Record<string, AdminPropertyPrice[]>,
  images: AdminPropertyImage[],
): PropertyPublishabilitySummary {
  const listingPublishability = listings.map((listing) =>
    evaluateListingPublishability(
      property,
      listing,
      pricesByListingId[listing.id] ?? [],
      images,
    ),
  );

  const isAnyPublishable = listingPublishability.some(
    (listing) => listing.isPublishable,
  );

  return {
    propertyId: property.id,
    slug: property.slug,
    statusVariant: resolvePropertyStatusVariant(property, isAnyPublishable),
    isAnyPublishable,
    hasCoverImage: hasCoverImage(images),
    listings: listingPublishability,
  };
}
