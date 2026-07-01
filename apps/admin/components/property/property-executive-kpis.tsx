import Link from "next/link";
import type { PropertyExecutiveSnapshot } from "@/lib/property/property-executive";
import type { PropertyPublishabilitySummary } from "@/lib/property/publishability";
import { propertySubNavHref } from "@/lib/property/navigation";
import { cn } from "@/lib/cn";

type PropertyExecutiveKpisProps = {
  propertyId: string;
  snapshot: PropertyExecutiveSnapshot;
  publishability: PropertyPublishabilitySummary;
};

type KpiCardProps = {
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning";
};

function KpiCard({ label, value, hint, href, tone = "default" }: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "rounded-xl border px-3 py-2.5 transition",
        tone === "success" && "border-emerald-200 bg-emerald-50/60",
        tone === "warning" && "border-amber-200 bg-amber-50/60",
        tone === "default" && "border-border bg-white",
        href && "hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-muted">{hint}</p> : null}
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

export function PropertyExecutiveKpis({
  propertyId,
  snapshot,
  publishability,
}: PropertyExecutiveKpisProps) {
  const publishableCount = publishability.listings.filter(
    (listing) => listing.isPublishable,
  ).length;
  const totalListings = publishability.listings.length;

  const publishableTone =
    publishableCount > 0
      ? "success"
      : totalListings > 0
        ? "warning"
        : "default";

  const imagesTone = snapshot.hasCoverImage
    ? "success"
    : snapshot.imageCount > 0
      ? "warning"
      : "default";

  const seoTone = snapshot.seo.isReady ? "success" : "warning";

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        label="Publicable"
        value={
          totalListings === 0
            ? "Sin operaciones"
            : `${publishableCount}/${totalListings}`
        }
        hint={
          publishability.isAnyPublishable
            ? "Visible en web"
            : "Requisitos pendientes"
        }
        href={propertySubNavHref(propertyId, "general")}
        tone={publishableTone}
      />
      <KpiCard
        label="Operaciones"
        value={String(snapshot.activeOperationsCount)}
        hint={
          snapshot.activeOperationsCount === 0
            ? "Sin activas"
            : snapshot.activeOperationLabels.join(", ")
        }
        href={propertySubNavHref(propertyId, "publicaciones")}
      />
      <KpiCard
        label="Imágenes"
        value={String(snapshot.imageCount)}
        hint={snapshot.hasCoverImage ? "Portada OK" : "Sin portada"}
        href={propertySubNavHref(propertyId, "imagenes")}
        tone={imagesTone}
      />
      <KpiCard
        label="Características"
        value={String(snapshot.featureCount)}
        hint={snapshot.featureCount === 0 ? "Sin asignar" : "Asignadas"}
        href={propertySubNavHref(propertyId, "caracteristicas")}
      />
      <KpiCard
        label="SEO"
        value={snapshot.seo.scoreLabel}
        hint={snapshot.seo.isReady ? "Metadatos básicos OK" : snapshot.seo.issues[0]}
        href={propertySubNavHref(propertyId, "general")}
        tone={seoTone}
      />
    </div>
  );
}
