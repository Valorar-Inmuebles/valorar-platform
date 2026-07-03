import { Badge } from "@repo/ui/badge";
import type { AdminDevelopment } from "@/lib/api/types/development";
import type { PriceCurrency } from "@/lib/api/types/property-price";
import { DevelopmentStatusBadge } from "@/components/development/development-status-badge";
import { formatPrice } from "@/lib/format/price";
import type { DevelopmentExecutiveSnapshot } from "@/lib/development/development-executive";
import { cn } from "@/lib/cn";

type DevelopmentExecutiveHeaderProps = {
  development: AdminDevelopment;
  snapshot: DevelopmentExecutiveSnapshot;
  className?: string;
};

export function DevelopmentExecutiveHeader({
  development,
  snapshot,
  className,
}: DevelopmentExecutiveHeaderProps) {
  const updatedLabel = new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(snapshot.updatedAt));

  const locationParts: string[] = [];
  const shortAddress = snapshot.shortAddress.trim();

  if (shortAddress) {
    locationParts.push(shortAddress);
  }

  if (
    snapshot.localityLabel !== "—" &&
    !locationParts.includes(snapshot.localityLabel)
  ) {
    locationParts.push(snapshot.localityLabel);
  }

  if (
    snapshot.provinceLabel !== "—" &&
    !locationParts.includes(snapshot.provinceLabel)
  ) {
    locationParts.push(snapshot.provinceLabel);
  }

  const priceLabel = snapshot.price
    ? formatPrice(
        snapshot.price.amount,
        snapshot.price.currency as PriceCurrency,
      )
    : null;

  return (
    <section
      className={cn(
        "rounded-xl bg-gradient-to-br from-white via-white to-zinc-50/90 px-4 py-3 ring-1 ring-border/60 sm:px-5 sm:py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          <Badge
            variant={
              snapshot.lifecycleLabel === "Activo" ? "success" : "neutral"
            }
          >
            {snapshot.lifecycleLabel}
          </Badge>
          {snapshot.status ? (
            <DevelopmentStatusBadge status={snapshot.status} />
          ) : null}
          {snapshot.hasFinancing ? (
            <Badge variant="info">Con financiación</Badge>
          ) : null}
        </div>
        <time
          dateTime={snapshot.updatedAt}
          className="shrink-0 text-[11px] text-muted"
          title="Última modificación"
        >
          {updatedLabel}
        </time>
      </div>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
            {development.title}
          </h1>
          {locationParts.length > 0 ? (
            <p className="text-sm text-muted">{locationParts.join(" · ")}</p>
          ) : null}
        </div>

        {priceLabel ? (
          <div className="shrink-0 text-right">
            <p className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {priceLabel}
            </p>
            <p className="text-xs text-muted">
              Desde · {snapshot.price!.currency}
            </p>
          </div>
        ) : (
          <p className="shrink-0 text-sm text-muted">Sin precio desde</p>
        )}
      </div>
    </section>
  );
}
