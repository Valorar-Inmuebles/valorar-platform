import Image from "next/image";
import Link from "next/link";
import type { PublicPropertyCard } from "@repo/shared-types";
import { formatArea } from "@/lib/format/area";
import { formatPrice } from "@/lib/format/price";
import { getPropertyTypeLabel } from "@/lib/format/labels";
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
      className="object-cover transition-transform duration-500 group-hover:scale-105"
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
    return null;
  }

  return (
    <p className="mt-2 text-sm text-muted">{items.join(" · ")}</p>
  );
}

export function PublicPropertyCard({ property }: PublicPropertyCardProps) {
  const location = [property.neighborhood, property.city].filter(Boolean).join(", ");

  return (
    <article className="group">
      <Link
        href={`/propiedades/${property.slug}`}
        className="block overflow-hidden rounded-2xl border border-border bg-background shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          <PropertyCoverImage property={property} />
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <ListingTypeBadge listingType={property.listingType} />
            <span className="inline-flex rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
              {getPropertyTypeLabel(property.propertyType)}
            </span>
          </div>
        </div>

        <div className="p-4 md:p-5">
          <p className="text-xl font-semibold tracking-tight text-foreground">
            {formatPrice(property.price, property.currency)}
          </p>
          <h3 className="mt-2 line-clamp-2 text-base font-medium text-foreground">
            {property.title}
          </h3>
          {location ? (
            <p className="mt-2 text-sm text-muted">{location}</p>
          ) : null}
          <PropertyMetrics property={property} />
        </div>
      </Link>
    </article>
  );
}
