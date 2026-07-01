import Link from "next/link";
import type { DashboardActivityItem } from "@/lib/api/types/dashboard";
import { cn } from "@/lib/cn";

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
    <section className="space-y-2">
      <div>
        <h2 className="text-sm font-semibold text-foreground">
          Actividad reciente
        </h2>
        <p className="text-xs text-muted">
          Últimos movimientos inferidos de fechas del sistema.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg px-3 py-2.5 text-sm text-muted ring-1 ring-border/70">
          Sin actividad reciente. Creá una propiedad o completá el catálogo.
        </p>
      ) : (
        <ol className="space-y-0 divide-y divide-border/70 rounded-lg bg-white ring-1 ring-border/70">
          {items.map((item, index) => (
            <li
              key={item.id}
              className={cn("px-3 py-3", index === 0 && "rounded-t-lg")}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
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
    </section>
  );
}
