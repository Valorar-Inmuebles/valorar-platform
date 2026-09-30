import { Badge, type BadgeVariant } from "@repo/ui/badge";
import type { PropertyListingType } from "@repo/shared-types";
import type { PropertyListingStatus } from "@/lib/api/types/property-listing";
import { getListingStatusLabel } from "@/lib/format/listing-labels";

const STATUS_BADGE_VARIANT: Record<PropertyListingStatus, BadgeVariant> = {
  DRAFT: "warning",
  ACTIVE: "success",
  PAUSED: "neutral",
  RESERVED: "info",
  CLOSED: "neutral",
};

type PropertyListingStatusBadgeProps = {
  status: PropertyListingStatus;
  listingType: PropertyListingType;
  className?: string;
  tooltip?: string;
};

export function PropertyListingStatusBadge({
  status,
  listingType,
  className,
  tooltip,
}: PropertyListingStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_BADGE_VARIANT[status]}
      className={className}
      tooltip={tooltip}
    >
      {getListingStatusLabel(status, listingType)}
    </Badge>
  );
}
