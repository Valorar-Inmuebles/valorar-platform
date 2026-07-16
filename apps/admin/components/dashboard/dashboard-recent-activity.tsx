import Link from "next/link";
import { ActivityIcon } from "@repo/icons";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/card";
import type { DashboardActivityItem } from "@/lib/api/types/dashboard";

type DashboardRecentActivityProps = {
  items: DashboardActivityItem[];
};

function formatRelativeTime(iso: string): string {
  const date = new Date(iso);
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return "Hace un momento";
  }

  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} minuto${diffMinutes === 1 ? "" : "s"}`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `Hace ${diffHours} hora${diffHours === 1 ? "" : "s"}`;
  }

  const diffDays = Math.floor(diffHours / 24);

  if (diffDays < 7) {
    return `Hace ${diffDays} día${diffDays === 1 ? "" : "s"}`;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function resolveActivityHeadline(item: DashboardActivityItem): string {
  if (item.actorName) {
    return `${item.actorName} · ${item.label}`;
  }

  return item.label;
}

export function DashboardRecentActivity({ items }: DashboardRecentActivityProps) {
  return (
    <Card className="flex h-[22rem] flex-col border-border bg-surface shadow-sm ring-1 ring-black/[0.03]">
      <CardHeader className="flex-col items-start gap-1 border-border px-5 py-4">
        <CardTitle className="text-sm text-foreground">
          Actividad reciente
        </CardTitle>
        <p className="text-xs text-muted">
          Últimos movimientos inferidos de fechas del sistema.
        </p>
      </CardHeader>

      <CardContent className="min-h-0 flex-1 overflow-y-auto px-0 py-0">
        {items.length === 0 ? (
          <p className="m-5 rounded-lg px-4 py-3.5 text-sm text-muted ring-1 ring-border/70">
            Sin actividad reciente. Creá una propiedad o completá el catálogo.
          </p>
        ) : (
          <ol className="divide-y divide-border/70">
            {items.map((item) => (
              <li key={item.id} className="px-5 py-3.5">
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-alt text-brand-green/80 ring-1 ring-border/50"
                  >
                    <ActivityIcon type={item.type} className="size-[1.05rem]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted">
                      {formatRelativeTime(item.timestamp)}
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-foreground">
                      {resolveActivityHeadline(item)}
                    </p>
                    <Link
                      href={`/propiedades/${item.propertyId}`}
                      className="mt-0.5 block truncate text-sm text-primary underline-offset-2 hover:underline"
                    >
                      {item.propertyTitle}
                      {item.detail ? ` · ${item.detail}` : ""}
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
