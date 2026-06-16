import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export type StatTrend = "positive" | "negative" | "neutral";

export type StatCardProps = {
  label: string;
  value: string;
  delta?: string;
  trend?: StatTrend;
  icon?: ReactNode;
};

const trendColor: Record<StatTrend, string> = {
  positive: "text-emerald-600",
  negative: "text-red-500",
  neutral: "text-zinc-400",
};

export function StatCard({
  label,
  value,
  delta,
  trend = "neutral",
  icon,
}: StatCardProps) {
  return (
    <Card flat className="cursor-default">
      <CardContent className="px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-zinc-500">{label}</span>
          {icon != null && (
            <span className="shrink-0 text-zinc-400">{icon}</span>
          )}
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="text-lg font-semibold tabular-nums tracking-tight text-zinc-900">
            {value}
          </span>
          {delta != null && (
            <span
              className={`text-xs font-medium tabular-nums ${trendColor[trend]}`}
            >
              {delta}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
