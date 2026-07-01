import Link from "next/link";
import { cn } from "@/lib/cn";

type DashboardMetricCardProps = {
  label: string;
  value: number;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning" | "muted";
  className?: string;
};

export function DashboardMetricCard({
  label,
  value,
  hint,
  href,
  tone = "default",
  className,
}: DashboardMetricCardProps) {
  const content = (
    <div
      className={cn(
        "flex min-h-[4.5rem] flex-col justify-between rounded-lg px-3 py-2.5 transition",
        tone === "success" && "bg-emerald-50/60 ring-1 ring-emerald-200/70",
        tone === "warning" && "bg-amber-50/60 ring-1 ring-amber-200/70",
        tone === "muted" && "bg-zinc-50/80 ring-1 ring-border/60",
        tone === "default" && "bg-white ring-1 ring-border/70",
        href && "hover:ring-primary/25",
        className,
      )}
    >
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <div>
        <p className="text-2xl font-semibold tabular-nums tracking-tight text-foreground">
          {value.toLocaleString("es-AR")}
        </p>
        {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
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
