import Link from "next/link";
import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { IconCheck, IconCircle } from "@/components/layout/icons";
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
            ? "mr-2 inline-flex size-[18px] align-middle text-emerald-600"
            : "mr-2 inline-flex size-[18px] align-middle text-muted"
        }
      >
        {item.passed ? (
          <IconCheck className="size-[1.05rem]" />
        ) : (
          <IconCircle className="size-[1.05rem]" />
        )}
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
    <div className="space-y-2 rounded-lg bg-zinc-50/60 px-3 py-2.5 ring-1 ring-border/50">
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

  const statusLine = summary.isAnyPublishable
    ? `${publishableCount} operación${publishableCount === 1 ? "" : "es"} lista${publishableCount === 1 ? "" : "s"} para la web.`
    : totalListings === 0
      ? "Creá operaciones en Comercialización para evaluar publicación."
      : `${totalListings - publishableCount} operación${totalListings - publishableCount === 1 ? "" : "es"} con requisitos pendientes.`;

  return (
    <section className="rounded-xl bg-white ring-1 ring-border/70">
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">
              Publicabilidad web
            </h2>
            <p className="truncate text-xs text-muted">{statusLine}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-primary">
            <span className="group-open:hidden">Ver checklist</span>
            <span className="hidden group-open:inline">Ocultar</span>
          </span>
        </summary>

        {summary.listings.length > 0 ? (
          <div className="space-y-3 border-t border-border/70 px-4 py-3">
            {summary.listings.map((listing) => (
              <ListingChecklistSection
                key={listing.listingId}
                listing={listing}
                propertyId={summary.propertyId}
              />
            ))}
          </div>
        ) : null}
      </details>
    </section>
  );
}
