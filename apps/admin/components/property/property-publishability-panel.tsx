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

function ListingSummaryRow({
  listing,
  propertyId,
}: {
  listing: ListingPublishability;
  propertyId: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-zinc-50/60 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {listing.listingTypeLabel}
        </span>
        <Badge variant={listing.isPublishable ? "success" : "warning"}>
          {listing.isPublishable ? "Visible en web" : "No publicable"}
        </Badge>
        <span className="text-xs text-muted">{listing.progress}%</span>
      </div>
      {listing.publicWebUrl ? (
        <Link
          href={listing.publicWebUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-primary underline-offset-2 hover:underline"
        >
          Ver en web
        </Link>
      ) : null}
      {!listing.isPublishable && listing.missing.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {getPublicationCtaGroupsForMissing(
            listing.missing,
            propertyId,
            listing.listingId,
          ).map((group) => (
            <Link key={group.id} href={group.href}>
              <Button variant="secondary" size="sm">
                {group.label}
              </Button>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PropertyPublishabilityPanel({
  summary,
}: PropertyPublishabilityPanelProps) {
  const publishableCount = summary.listings.filter(
    (listing) => listing.isPublishable,
  ).length;
  const totalListings = summary.listings.length;

  const uniqueChecks = new Map<string, PublishabilityCheckItem>();

  for (const listing of summary.listings) {
    for (const item of listing.items) {
      const existing = uniqueChecks.get(item.key);
      if (!existing || (!existing.passed && item.passed)) {
        uniqueChecks.set(item.key, item);
      }
    }
  }

  const consolidatedChecks = Array.from(uniqueChecks.values());

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">Publicabilidad web</CardTitle>
          <PropertyStatusBadge status={summary.statusVariant} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted">
          {summary.isAnyPublishable
            ? "Al menos una operación cumple los requisitos para el sitio web."
            : "Completá los requisitos pendientes para habilitar la visibilidad web."}
          {totalListings > 0 ? (
            <>
              {" "}
              <span className="font-medium text-foreground">
                {publishableCount}/{totalListings} operaciones publicables.
              </span>
            </>
          ) : null}
        </p>

        {summary.listings.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted">
            Sin operaciones comerciales. Creá una operación en Comercialización
            para evaluar su publicabilidad.
          </p>
        ) : (
          <div className="space-y-2">
            {summary.listings.map((listing) => (
              <ListingSummaryRow
                key={listing.listingId}
                listing={listing}
                propertyId={summary.propertyId}
              />
            ))}
          </div>
        )}

        {consolidatedChecks.length > 0 ? (
          <details className="group rounded-lg border border-border">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="text-muted group-open:hidden">
                Ver checklist detallado
              </span>
              <span className="hidden group-open:inline">
                Ocultar checklist detallado
              </span>
            </summary>
            <ul className="space-y-2 border-t border-border px-4 py-3">
              {consolidatedChecks.map((item) => (
                <ChecklistItem key={item.key} item={item} />
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
