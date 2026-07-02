import Link from "next/link";
import type { ReactNode } from "react";
import {
  IconCheckCircle,
  IconGlobe,
  IconImage,
  IconStar,
  IconTag,
} from "@/components/layout/icons";
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
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: "default" | "success" | "warning";
};

const kpiIconClassName = "size-[1.05rem]";

function KpiCard({ icon, label, value, hint, href, tone = "default" }: KpiCardProps) {
  const content = (
    <div
      className={cn(
        "flex min-h-[4.5rem] items-start gap-2 rounded-lg px-2.5 py-2 transition",
        tone === "success" && "bg-emerald-50/70 ring-1 ring-emerald-200/80",
        tone === "warning" && "bg-amber-50/70 ring-1 ring-amber-200/80",
        tone === "default" && "bg-white ring-1 ring-border/70",
        href && "hover:ring-primary/25",
      )}
    >
      <span
        aria-hidden
        className="mt-0.5 flex size-[18px] shrink-0 items-center justify-center text-muted"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
          {label}
        </p>
        <p className="mt-0.5 truncate text-sm font-semibold text-foreground">
          {value}
        </p>
        {hint ? (
          <p className="mt-0.5 truncate text-[11px] text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block min-w-0">
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
    <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-5">
      <KpiCard
        icon={<IconCheckCircle className={kpiIconClassName} />}
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
        icon={<IconTag className={kpiIconClassName} />}
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
        icon={<IconImage className={kpiIconClassName} />}
        label="Imágenes"
        value={String(snapshot.imageCount)}
        hint={snapshot.hasCoverImage ? "Portada OK" : "Sin portada"}
        href={propertySubNavHref(propertyId, "imagenes")}
        tone={imagesTone}
      />
      <KpiCard
        icon={<IconStar className={kpiIconClassName} />}
        label="Características"
        value={String(snapshot.featureCount)}
        hint={snapshot.featureCount === 0 ? "Sin asignar" : "Asignadas"}
        href={propertySubNavHref(propertyId, "caracteristicas")}
      />
      <KpiCard
        icon={<IconGlobe className={kpiIconClassName} />}
        label="SEO"
        value={snapshot.seo.scoreLabel}
        hint={
          snapshot.seo.isReady
            ? "Metadatos básicos OK"
            : snapshot.seo.issues[0]
        }
        href={propertySubNavHref(propertyId, "general")}
        tone={seoTone}
      />
    </div>
  );
}
