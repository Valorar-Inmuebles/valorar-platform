import Link from "next/link";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
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

function ListingChecklistSection({
  listing,
  propertyId,
}: {
  listing: ListingPublishability;
  propertyId: string;
}) {
  return (
    <div className="space-y-2 rounded-lg border border-border/70 bg-zinc-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {listing.listingTypeLabel}
        </span>
        <Badge variant={listing.isPublishable ? "success" : "warning"}>
          {listing.isPublishable ? "Publicable" : "Pendiente"}
        </Badge>
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
      </div>

      <ul className="space-y-1.5">
        {listing.items.map((item) => (
          <ChecklistItem key={item.key} item={item} />
        ))}
      </ul>

      {!listing.isPublishable && listing.missing.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
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
  const pendingCount = totalListings - publishableCount;

  return (
    <section className="rounded-xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">
            Publicabilidad web
          </h2>
          <p className="text-xs text-muted">
            {summary.isAnyPublishable
              ? `${publishableCount} operación${publishableCount === 1 ? "" : "es"} lista${publishableCount === 1 ? "" : "s"} para la web.`
              : totalListings === 0
                ? "Creá operaciones en Comercialización para evaluar publicación."
                : `${pendingCount} operación${pendingCount === 1 ? "" : "es"} con requisitos pendientes.`}
          </p>
        </div>
        {totalListings > 0 ? (
          <Badge variant={summary.isAnyPublishable ? "success" : "warning"}>
            {publishableCount}/{totalListings}
          </Badge>
        ) : null}
      </div>

      {summary.listings.length > 0 ? (
        <details className="group border-t border-border">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
            <span className="text-muted group-open:hidden">
              Ver checklist completo
            </span>
            <span className="hidden group-open:inline">
              Ocultar checklist completo
            </span>
          </summary>
          <div className="space-y-3 border-t border-border px-4 py-3">
            {summary.listings.map((listing) => (
              <ListingChecklistSection
                key={listing.listingId}
                listing={listing}
                propertyId={summary.propertyId}
              />
            ))}
          </div>
        </details>
      ) : null}
    </section>
  );
}
