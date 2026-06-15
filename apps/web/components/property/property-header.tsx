import type { PublicPropertyDetail } from "@repo/shared-types";
import { formatArea } from "@/lib/format/area";
import {
  getListingTypeLabel,
  getPropertyTypeLabel,
} from "@/lib/format/labels";
import { ListingTypeBadge } from "./listing-type-badge";

type PropertyHeaderProps = {
  property: PublicPropertyDetail;
};

function PropertyMetrics({ property }: { property: PublicPropertyDetail }) {
  const items = [
    property.bedrooms != null ? `${property.bedrooms} dormitorios` : null,
    property.bathrooms != null ? `${property.bathrooms} baños` : null,
    formatArea(property.totalArea),
  ].filter(Boolean);

  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

export function PropertyHeader({ property }: PropertyHeaderProps) {
  const location = [property.neighborhood, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <header>
      <div className="flex flex-wrap items-center gap-2">
        <ListingTypeBadge listingType={property.listingType} />
        <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-foreground">
          {getPropertyTypeLabel(property.propertyType)}
        </span>
        {property.listing.isFeatured ? (
          <span className="inline-flex rounded-full bg-secondary/15 px-2.5 py-1 text-xs font-semibold text-secondary">
            Destacada
          </span>
        ) : null}
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {property.title}
      </h1>

      {location ? (
        <p className="mt-3 text-base text-muted">{location}</p>
      ) : null}

      <p className="mt-2 text-sm text-muted">
        Operación: {getListingTypeLabel(property.listingType)}
      </p>

      <PropertyMetrics property={property} />
    </header>
  );
}
