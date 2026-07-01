import { Badge } from "@repo/ui/badge";
import type { AdminProperty } from "@/lib/api/types/property";
import type { PriceCurrency } from "@/lib/api/types/property-price";
import { getPropertyTypeLabel } from "@/lib/format/property-labels";
import { formatPrice } from "@/lib/format/price";
import type { PropertyExecutiveSnapshot } from "@/lib/property/property-executive";
import { cn } from "@/lib/cn";

type PropertyExecutiveHeaderProps = {
  property: AdminProperty;
  snapshot: PropertyExecutiveSnapshot;
  className?: string;
};

export function PropertyExecutiveHeader({
  property,
  snapshot,
  className,
}: PropertyExecutiveHeaderProps) {
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

  const priceLabel = snapshot.primaryPrice
    ? formatPrice(
        snapshot.primaryPrice.amount,
        snapshot.primaryPrice.currency as PriceCurrency,
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
          <Badge variant="neutral">
            {getPropertyTypeLabel(property.propertyType)}
          </Badge>
          <Badge
            variant={
              snapshot.lifecycleLabel === "Activa" ? "success" : "neutral"
            }
          >
            {snapshot.lifecycleLabel}
          </Badge>
          <Badge
            variant={
              snapshot.commercialLabel === "Publicada" ? "info" : "warning"
            }
          >
            {snapshot.commercialLabel}
          </Badge>
          {snapshot.isFeatured ? (
            <Badge variant="info">Destacada</Badge>
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
            {property.title}
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
              {snapshot.primaryPrice!.listingTypeLabel} ·{" "}
              {snapshot.primaryPrice!.currency}
            </p>
          </div>
        ) : (
          <p className="shrink-0 text-sm text-muted">Sin precio principal</p>
        )}
      </div>
    </section>
  );
}
