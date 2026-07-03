import { Badge, type BadgeVariant } from "@repo/ui/badge";
import type { DevelopmentStatus } from "@repo/shared-types";
import { getDevelopmentStatusLabel } from "@/lib/development/format/development-status-labels";

const STATUS_BADGE_VARIANT: Record<DevelopmentStatus, BadgeVariant> = {
  IN_PIT: "warning",
  UNDER_CONSTRUCTION: "info",
  COMPLETED: "success",
};

type DevelopmentStatusBadgeProps = {
  status: DevelopmentStatus;
  className?: string;
};

export function DevelopmentStatusBadge({
  status,
  className,
}: DevelopmentStatusBadgeProps) {
  return (
    <Badge variant={STATUS_BADGE_VARIANT[status]} className={className}>
      {getDevelopmentStatusLabel(status)}
    </Badge>
  );
}
