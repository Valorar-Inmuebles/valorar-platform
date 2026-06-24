import { Playfair_Display } from "next/font/google";
import type { PublicPropertyDetail } from "@repo/shared-types";
import { LocationIcon } from "@/components/icons";
import { getPropertyTypeLabel } from "@/lib/format/labels";
import { ListingTypeBadge } from "./listing-type-badge";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

type PropertyHeaderProps = {
  property: PublicPropertyDetail;
};

export function PropertyHeader({ property }: PropertyHeaderProps) {
  const location = [property.neighborhood, property.city]
    .filter(Boolean)
    .join(", ");

  return (
    <header>
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

      <h1
        className={`${playfair.className} mt-3 text-3xl font-medium leading-tight tracking-tight text-text-primary md:text-4xl lg:text-[2.75rem]`}
      >
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
