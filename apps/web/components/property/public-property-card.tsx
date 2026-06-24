import Image from "next/image";
import Link from "next/link";
import type { PublicPropertyCard } from "@repo/shared-types";
import { formatArea } from "@/lib/format/area";
import { formatPrice } from "@/lib/format/price";
import { getPropertyTypeLabel } from "@/lib/format/labels";
import { buildPublicPropertyDetailHref } from "@/lib/url/public-property-detail";
import { ListingTypeBadge } from "./listing-type-badge";
import { PropertyImagePlaceholder } from "./property-image-placeholder";

type PublicPropertyCardProps = {
  property: PublicPropertyCard;
};

function PropertyCoverImage({
  property,
}: {
  property: PublicPropertyCard;
}) {
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
      unoptimized
      className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
    />
  );
}

function PropertyMetrics({ property }: { property: PublicPropertyCard }) {
  const area = formatArea(property.totalArea);
  const items = [
    property.bedrooms != null ? `${property.bedrooms} dorm.` : null,
    property.bathrooms != null ? `${property.bathrooms} baños` : null,
    area,
  ].filter(Boolean);

  if (items.length === 0) {
    return <span className="block min-h-5" aria-hidden />;
  }

  return (
    <p className="text-sm text-text-secondary">{items.join(" · ")}</p>
  );
}

export function PublicPropertyCard({ property }: PublicPropertyCardProps) {
  const location = [property.neighborhood, property.city].filter(Boolean).join(", ");

  return (
    <article className="group h-full">
      <Link
        href={buildPublicPropertyDetailHref(property.slug, property.listingType)}
        className="flex h-full flex-col overflow-hidden rounded-2xl border border-border-default bg-surface-card transition-colors duration-300 hover:border-brand-green/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
      >
        <div className="relative aspect-[4/3] shrink-0 overflow-hidden bg-surface-alt">
          <PropertyCoverImage property={property} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <ListingTypeBadge listingType={property.listingType} />
            <span className="inline-flex rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {getPropertyTypeLabel(property.propertyType)}
            </span>
          </div>
        </div>

        <div className="flex flex-1 flex-col p-4 md:p-5">
          <p className="text-xl font-semibold tracking-tight text-text-primary">
            {formatPrice(property.price, property.currency)}
          </p>
          <h3 className="mt-2 line-clamp-2 min-h-[2.75rem] text-base font-medium leading-snug text-text-primary md:min-h-[3rem]">
            {property.title}
          </h3>

          <div className="mt-auto space-y-2 pt-4">
            {location ? (
              <p className="text-sm text-text-secondary">{location}</p>
            ) : (
              <span className="block min-h-5" aria-hidden />
            )}
            <PropertyMetrics property={property} />
          </div>
        </div>
      </Link>
    </article>
  );
}
