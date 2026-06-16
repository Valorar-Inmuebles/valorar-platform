import { Badge, type BadgeVariant } from "@repo/ui/badge";
import {
  PROPERTY_STATUS_LABELS,
  type PropertyStatusVariant,
} from "@/lib/property/navigation";

const STATUS_BADGE_VARIANT: Record<PropertyStatusVariant, BadgeVariant> = {
  active: "success",
  archived: "neutral",
  published: "info",
  "commercial-draft": "warning",
};

type PropertyStatusBadgeProps = {
  status: PropertyStatusVariant;
  className?: string;
  tooltip?: string;
};

export function PropertyStatusBadge({
  status,
  className,
  tooltip,
}: PropertyStatusBadgeProps) {
  return (
    <Badge
      variant={STATUS_BADGE_VARIANT[status]}
      className={className}
      tooltip={tooltip}
    >
      {PROPERTY_STATUS_LABELS[status]}
    </Badge>
  );
}
