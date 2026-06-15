import type { ReactNode } from "react";
import { Badge, type BadgeVariant } from "@/components/ui/badge";

export type ActivityItem = {
  id: string;
  description: string;
  timestamp: string;
  tag?: string;
  tagVariant?: BadgeVariant;
  icon?: ReactNode;
};

export type ActivityFeedProps = {
  items: ActivityItem[];
  emptyState?: ReactNode;
};

export function ActivityFeed({ items, emptyState }: ActivityFeedProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-8 text-center text-sm text-zinc-400">
        {emptyState ?? "No recent activity"}
      </div>
    );
  }

  return (
    <div className="divide-y divide-zinc-100">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex items-start justify-between gap-3 px-4 py-3 transition-colors duration-100 hover:bg-zinc-50"
        >
          <div className="flex min-w-0 items-start gap-2.5">
            {item.icon != null && (
              <span className="mt-0.5 shrink-0 text-zinc-400">{item.icon}</span>
            )}
            <div className="min-w-0 space-y-0.5">
              <p className="truncate text-sm text-zinc-700">
                {item.description}
              </p>
              <p className="text-xs text-zinc-400">{item.timestamp}</p>
            </div>
          </div>
          {item.tag != null && (
            <Badge variant={item.tagVariant ?? "neutral"} className="shrink-0">
              {item.tag}
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}
