import type { PropertyListingType } from "@repo/shared-types";
import { getListingTypeLabel } from "@/lib/format/labels";

type ListingTypeBadgeProps = {
  listingType: PropertyListingType;
  className?: string;
};

export function ListingTypeBadge({
  listingType,
  className = "",
}: ListingTypeBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full bg-white/95 px-2.5 py-1 text-xs font-semibold text-primary shadow-sm backdrop-blur ${className}`}
    >
      {getListingTypeLabel(listingType)}
    </span>
  );
}
