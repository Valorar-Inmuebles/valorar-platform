import type { ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type DashboardMetricCardProps = {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  icon?: ReactNode;
  tone?: "default" | "success" | "warning" | "muted";
  className?: string;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  href,
  icon,
  tone = "default",
  className,
}: DashboardMetricCardProps) {
  const content = (
    <div
      className={cn(
        "flex min-h-[5.25rem] flex-col justify-between gap-3 rounded-xl px-4 py-3.5 transition",
        tone === "success" && "bg-emerald-50/70 ring-1 ring-emerald-200/60",
        tone === "warning" && "bg-amber-50/70 ring-1 ring-amber-200/60",
        tone === "muted" && "bg-zinc-50/90 ring-1 ring-border/50",
        tone === "default" && "bg-white ring-1 ring-border/60",
        href && "hover:ring-primary/30",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        {icon ? (
          <span
            aria-hidden
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-lg",
              tone === "success" && "bg-emerald-100/80 text-emerald-700",
              tone === "warning" && "bg-amber-100/80 text-amber-700",
              tone === "muted" && "bg-zinc-100 text-zinc-500",
              tone === "default" && "bg-surface-alt text-brand-green/80",
            )}
          >
            {icon}
          </span>
        ) : null}
      </div>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value.toLocaleString("es-AR")}
        </p>
        {hint ? <p className="mt-1 text-[11px] text-muted">{hint}</p> : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block">
      {content}
    </Link>
  );
}
