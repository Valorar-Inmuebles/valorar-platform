import Link from "next/link";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/ui/card";
import { PropertyStatusBadge } from "@/components/property/property-status-badge";
import type {
  ListingPublishability,
  PropertyPublishabilitySummary,
  PublishabilityCheckItem,
} from "@/lib/property/publishability";
import { getPublicationCtaGroupsForMissing } from "@/lib/property/publication-check-keys";

type PropertyPublishabilityPanelProps = {
  summary: PropertyPublishabilitySummary;
};

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted">
        <span>Progreso de publicación</span>
        <span>{progress}%</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-zinc-200"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-emerald-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function ChecklistItem({ item }: { item: PublishabilityCheckItem }) {
  const icon = item.passed ? "✓" : "○";
  const content = (
    <span
      className={
        item.passed ? "text-foreground" : "text-muted hover:text-foreground"
      }
    >
      <span
        aria-hidden
        className={
          item.passed
            ? "mr-2 font-semibold text-emerald-600"
            : "mr-2 text-muted"
        }
      >
        {icon}
      </span>
      {item.label}
      {!item.passed && item.message ? (
        <span className="ml-1 text-xs text-muted">— {item.message}</span>
      ) : null}
    </span>
  );

  if (item.passed || !item.href) {
    return <li className="text-sm">{content}</li>;
  }

  return (
    <li className="text-sm">
      <Link href={item.href} className="underline-offset-2 hover:underline">
        {content}
      </Link>
    </li>
  );
}

function ListingPublishabilitySection({
  listing,
  propertyId,
}: {
  listing: ListingPublishability;
  propertyId: string;
}) {
  const ctaGroups = getPublicationCtaGroupsForMissing(
    listing.missing,
    propertyId,
    listing.listingId,
  );

  return (
    <section className="rounded-lg border border-border bg-zinc-50/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-foreground">
          {listing.listingTypeLabel}
        </h3>
        <Badge variant={listing.isPublishable ? "success" : "warning"}>
          {listing.isPublishable ? "Visible en web" : "No publicable"}
        </Badge>
      </div>

      <div className="mt-3">
        <ProgressBar progress={listing.progress} />
      </div>

      <ul className="mt-3 space-y-2">
        {listing.items.map((item) => (
          <ChecklistItem key={item.key} item={item} />
        ))}
      </ul>

      {ctaGroups.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {ctaGroups.map((group) => (
            <Link key={group.id} href={group.href}>
              <Button variant="secondary" size="sm">
                {group.label}
              </Button>
            </Link>
          ))}
        </div>
      ) : null}

      {listing.publicWebUrl ? (
        <p className="mt-4">
          <Link
            href={listing.publicWebUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
          >
            Ver en web ({listing.listingTypeLabel})
          </Link>
        </p>
      ) : null}
    </section>
  );
}

export function PropertyPublishabilityPanel({
  summary,
}: PropertyPublishabilityPanelProps) {
  const publicWebBaseUrl =
    summary.listings.find((listing) => listing.publicWebUrl)?.publicWebUrl ??
    null;

  const aggregateProgress =
    summary.listings.length === 0
      ? 0
      : Math.round(
          summary.listings.reduce((total, listing) => total + listing.progress, 0) /
            summary.listings.length,
        );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Publicabilidad web</CardTitle>
        <PropertyStatusBadge status={summary.statusVariant} />
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted">
          Una propiedad es visible en la web pública cuando cumple todos los
          requisitos por operación comercial (venta, alquiler o temporario).
        </p>

        {summary.listings.length > 0 ? (
          <ProgressBar progress={aggregateProgress} />
        ) : null}

        {summary.isAnyPublishable ? (
          <p className="text-sm font-medium text-foreground">
            Al menos una operación está lista para publicarse en el sitio web.
          </p>
        ) : (
          <p className="text-sm text-muted">
            Completá los requisitos pendientes para habilitar la visibilidad en
            la web pública.
          </p>
        )}

        {summary.listings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
            Sin publicaciones comerciales. Creá una publicación para evaluar su
            publicabilidad.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.listings.map((listing) => (
              <ListingPublishabilitySection
                key={listing.listingId}
                listing={listing}
                propertyId={summary.propertyId}
              />
            ))}
          </div>
        )}

        {!publicWebBaseUrl && summary.isAnyPublishable ? (
          <p className="text-xs text-muted">
            Configurá `PUBLIC_WEB_URL` o `NEXT_PUBLIC_SITE_URL` para habilitar
            enlaces «Ver en web».
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
