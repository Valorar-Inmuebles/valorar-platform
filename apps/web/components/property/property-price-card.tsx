import type { PublicPropertyDetail } from "@repo/shared-types";
import { formatPrice } from "@/lib/format/price";
import { getListingTypeLabel } from "@/lib/format/labels";

type PropertyPriceCardProps = {
  property: PublicPropertyDetail;
};

export function PropertyPriceCard({ property }: PropertyPriceCardProps) {
  const { price, listing } = property;

  return (
    <aside className="rounded-2xl border border-border bg-white p-6 shadow-sm lg:sticky lg:top-24">
      <p className="text-sm font-medium uppercase tracking-wide text-muted">
        {getListingTypeLabel(property.listingType)}
      </p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
        {formatPrice(price.amount, price.currency)}
      </p>
      {price.label ? (
        <p className="mt-1 text-sm text-muted">{price.label}</p>
      ) : null}

      {listing.expensesAmount != null && listing.expensesCurrency ? (
        <p className="mt-4 text-sm text-foreground">
          <span className="font-medium">Expensas:</span>{" "}
          {formatPrice(listing.expensesAmount, listing.expensesCurrency)}
        </p>
      ) : null}

      {listing.publishedAt ? (
        <p className="mt-4 text-sm text-muted">
          Publicada el{" "}
          {new Intl.DateTimeFormat("es-AR", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }).format(new Date(listing.publishedAt))}
        </p>
      ) : null}
    </aside>
  );
}
