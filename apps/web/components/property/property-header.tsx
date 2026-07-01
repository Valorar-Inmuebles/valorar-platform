import type { PublicPropertyDetail } from "@repo/shared-types";
import { LocationIcon } from "@/components/icons";
import { getPropertyTypeLabel } from "@/lib/format/labels";
import { PropertyFavoriteButton } from "./property-favorite-button";
import { PropertyShareButton } from "./property-share-button";
import { ListingTypeBadge } from "./listing-type-badge";

type PropertyHeaderProps = {
  property: PublicPropertyDetail;
  shareUrl: string;
};

function resolveLocation(property: PublicPropertyDetail): string {
  const parts = [
    property.neighborhoodName ?? property.neighborhood,
    property.localityName ?? property.city,
    property.provinceName ?? property.province,
  ].filter(Boolean);

  return [...new Set(parts)].join(", ");
}

export function PropertyHeader({ property, shareUrl }: PropertyHeaderProps) {
  const location = resolveLocation(property);

  return (
    <header>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ListingTypeBadge listingType={property.listingType} />
          <span className="inline-flex rounded-full bg-surface-alt px-2.5 py-1 text-xs font-medium text-text-primary">
            {getPropertyTypeLabel(property.propertyType)}
          </span>
          {property.listing.isFeatured ? (
            <span className="inline-flex rounded-full bg-brand-orange/10 px-2.5 py-1 text-xs font-semibold text-brand-orange">
              Destacada
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <PropertyShareButton title={property.title} url={shareUrl} />
          <PropertyFavoriteButton />
        </div>
      </div>

      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-text-primary md:text-4xl lg:text-[2.5rem] lg:leading-tight">
        {property.title}
      </h1>

      {location ? (
        <p className="mt-3 inline-flex items-center gap-2 text-base text-text-secondary">
          <LocationIcon size={18} className="shrink-0 text-brand-green" />
          {location}
        </p>
      ) : null}
    </header>
  );
}
