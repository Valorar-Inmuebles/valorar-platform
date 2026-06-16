import Link from "next/link";
import { Badge } from "@repo/ui/badge";
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
} from "@/lib/property/publishability";

type PropertyPublishabilityPanelProps = {
  summary: PropertyPublishabilitySummary;
};

function ChecklistItem({
  label,
  met,
  href,
}: {
  label: string;
  met: boolean;
  href?: string;
}) {
  const icon = met ? "✓" : "○";
  const content = (
    <span
      className={
        met ? "text-foreground" : "text-muted hover:text-foreground"
      }
    >
      <span
        aria-hidden
        className={
          met
            ? "mr-2 font-semibold text-emerald-600"
            : "mr-2 text-muted"
        }
      >
        {icon}
      </span>
      {label}
    </span>
  );

  if (met || !href) {
    return <li className="text-sm">{content}</li>;
  }

  return (
    <li className="text-sm">
      <Link href={href} className="underline-offset-2 hover:underline">
        {content}
      </Link>
    </li>
  );
}

function ListingPublishabilitySection({
  listing,
}: {
  listing: ListingPublishability;
}) {
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

      <ul className="mt-3 space-y-2">
        {listing.items.map((item) => (
          <ChecklistItem
            key={item.id}
            label={item.label}
            met={item.met}
            href={item.href}
          />
        ))}
      </ul>

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
