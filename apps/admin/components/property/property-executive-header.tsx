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

function MetaItem({
  label,
  value,
  emphasize = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 truncate text-sm",
          emphasize ? "font-semibold text-foreground" : "text-foreground/90",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

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

  const operationsLabel =
    snapshot.activeOperationsCount === 0
      ? "Sin operaciones activas"
      : snapshot.activeOperationLabels.join(" · ");

  const priceLabel = snapshot.primaryPrice
    ? formatPrice(
        snapshot.primaryPrice.amount,
        snapshot.primaryPrice.currency as PriceCurrency,
      )
    : "—";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-gradient-to-br from-white via-white to-zinc-50/80 p-4 shadow-sm sm:p-5",
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="neutral">{getPropertyTypeLabel(property.propertyType)}</Badge>
            <Badge
              variant={snapshot.lifecycleLabel === "Activa" ? "success" : "neutral"}
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

          <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
            {property.title}
          </h1>

          <p className="text-sm text-muted">
            {snapshot.shortAddress}
            {snapshot.localityLabel !== "—" ? ` · ${snapshot.localityLabel}` : ""}
            {snapshot.provinceLabel !== "—" ? ` · ${snapshot.provinceLabel}` : ""}
          </p>
        </div>

        {snapshot.primaryPrice ? (
          <div className="rounded-xl border border-border bg-white px-4 py-3 text-right shadow-sm">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Precio principal · {snapshot.primaryPrice.listingTypeLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">
              {priceLabel}
            </p>
            <p className="text-xs text-muted">{snapshot.primaryPrice.currency}</p>
          </div>
        ) : null}
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border/70 pt-4 sm:grid-cols-3 lg:grid-cols-6">
        <MetaItem label="Operaciones activas" value={operationsLabel} />
        <MetaItem
          label="Imágenes"
          value={
            snapshot.imageCount === 0
              ? "Sin imágenes"
              : `${snapshot.imageCount}${snapshot.hasCoverImage ? " · con portada" : ""}`
          }
        />
        <MetaItem
          label="Moneda principal"
          value={snapshot.primaryPrice?.currency ?? "—"}
        />
        <MetaItem label="Provincia" value={snapshot.provinceLabel} />
        <MetaItem label="Localidad" value={snapshot.localityLabel} />
        <MetaItem label="Última modificación" value={updatedLabel} />
      </dl>
    </section>
  );
}
