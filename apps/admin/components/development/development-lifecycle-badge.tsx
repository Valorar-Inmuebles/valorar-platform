import { Badge, type BadgeVariant } from "@repo/ui/badge";
import {
  DEVELOPMENT_LIFECYCLE_LABELS,
  type DevelopmentLifecycleVariant,
} from "@/lib/development/navigation";

const LIFECYCLE_BADGE_VARIANT: Record<DevelopmentLifecycleVariant, BadgeVariant> =
  {
    active: "success",
    archived: "neutral",
  };

type DevelopmentLifecycleBadgeProps = {
  status: DevelopmentLifecycleVariant;
  className?: string;
};

export function DevelopmentLifecycleBadge({
  status,
  className,
}: DevelopmentLifecycleBadgeProps) {
  return (
    <Badge variant={LIFECYCLE_BADGE_VARIANT[status]} className={className}>
      {DEVELOPMENT_LIFECYCLE_LABELS[status]}
    </Badge>
  );
}
