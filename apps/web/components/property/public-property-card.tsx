import Image from "next/image";
import Link from "next/link";
import type { PublicPropertyCard } from "@repo/shared-types";
import { formatArea } from "@/lib/format/area";
import { formatPrice } from "@/lib/format/price";
import { getPropertyTypeLabel, getListingTypeLabel } from "@/lib/format/labels";
import { buildPublicPropertyDetailHref } from "@/lib/url/public-property-detail";
import { PropertyFavoriteButton } from "./property-favorite-button";
import { ListingTypeBadge } from "./listing-type-badge";
import { PropertyImagePlaceholder } from "./property-image-placeholder";

type PublicPropertyCardProps = {
  property: PublicPropertyCard;
};

function resolveLocation(property: PublicPropertyCard): string {
  const parts = [
    property.neighborhoodName ?? property.neighborhood,
    property.localityName ?? property.city,
    property.provinceName,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ");
}

function PropertyCoverImage({ property }: { property: PublicPropertyCard }) {
  const imageUrl = property.coverImage.url;
  const alt = property.coverImage.altText ?? property.title;

  if (!imageUrl) {
    return <PropertyImagePlaceholder />;
  }

  return (
    <Image
      src={imageUrl}
      alt={alt}
      fill
      loading="lazy"
      unoptimized
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

function PropertyMetrics({ property }: { property: PublicPropertyCard }) {
  const items = [
    property.bedrooms != null ? `${property.bedrooms} dorm.` : null,
    property.bathrooms != null ? `${property.bathrooms} baño${property.bathrooms === 1 ? "" : "s"}` : null,
    formatArea(property.totalArea),
  ].filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <p className="text-sm text-text-secondary">{items.join(" · ")}</p>
  );
}

export function PublicPropertyCard({ property }: PublicPropertyCardProps) {
  const location = resolveLocation(property);

  return (
    <article className="group h-full">
      <Link
        href={buildPublicPropertyDetailHref(property.slug, property.listingType)}
        className="flex h-full flex-col overflow-hidden rounded-2xl bg-surface-card ring-1 ring-border-default/80 transition duration-300 hover:-translate-y-0.5 hover:shadow-lg hover:ring-brand-green/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <div className="relative aspect-[5/4] shrink-0 overflow-hidden bg-surface-alt">
          <PropertyCoverImage property={property} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <ListingTypeBadge listingType={property.listingType} />
          </div>
          <div className="absolute right-3 top-3">
            <PropertyFavoriteButton size="sm" />
          </div>
          <div className="absolute bottom-3 left-3">
            <span className="inline-flex rounded-full bg-black/50 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm">
              {getPropertyTypeLabel(property.propertyType)}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-3 p-4 md:p-5">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-text-primary">
              {formatPrice(property.price, property.currency)}
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-text-secondary">
              {getListingTypeLabel(property.listingType)}
            </p>
          </div>

          <h3 className="line-clamp-2 text-base font-medium leading-snug text-text-primary">
            {property.title}
          </h3>

          <div className="mt-auto space-y-1.5">
            {location ? (
              <p className="line-clamp-1 text-sm text-text-secondary">{location}</p>
            ) : null}
            <PropertyMetrics property={property} />
          </div>
        </div>
      </Link>
    </article>
  );
}
