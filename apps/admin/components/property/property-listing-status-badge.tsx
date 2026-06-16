import { Badge, type BadgeVariant } from "@repo/ui/badge";
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
  className?: string;
  tooltip?: string;
};

export function PropertyListingStatusBadge({
  status,
  className,
  tooltip,
}: PropertyListingStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_BADGE_VARIANT[status]}
      className={className}
      tooltip={tooltip}
    >
      {getListingStatusLabel(status)}
    </Badge>
  );
}
