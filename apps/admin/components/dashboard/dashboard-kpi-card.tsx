import Link from "next/link";
import { Card, CardContent } from "@repo/ui/card";
import { cn } from "@/lib/cn";

type DashboardKpiCardProps = {
  label: string;
  value: number;
  href?: string;
  className?: string;
};

export function DashboardKpiCard({
  label,
  value,
  href,
  className,
}: DashboardKpiCardProps) {
  const content = (
    <Card className={cn("h-full", className)}>
      <CardContent className="flex h-full flex-col justify-between gap-2 p-5">
        <p className="text-sm text-muted">{label}</p>
        <p className="text-3xl font-bold tabular-nums text-foreground">
          {value.toLocaleString("es-AR")}
        </p>
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <Link href={href} className="block transition hover:opacity-90">
        {content}
      </Link>
    );
  }

  return content;
}
