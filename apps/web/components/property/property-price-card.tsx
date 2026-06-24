import type { PublicPropertyDetail } from "@repo/shared-types";
import { formatPrice } from "@/lib/format/price";
import { getListingTypeLabel } from "@/lib/format/labels";
import {
  buildPropertyWhatsAppMessage,
  getWhatsAppUrl,
} from "@/lib/tenant/get-whatsapp-url";
import { PropertyContactCard } from "./property-contact-card";
import { WhatsAppCTA } from "./whatsapp-cta";

export type PropertyPriceCardContact = {
  whatsapp: string;
  email: string;
  phone: string;
  siteUrl: string;
};

type PropertyPriceCardProps = {
  property: PublicPropertyDetail;
  contact: PropertyPriceCardContact;
};

export function PropertyPriceCard({ property, contact }: PropertyPriceCardProps) {
  const { price, listing } = property;

  const whatsappMessage = buildPropertyWhatsAppMessage({
    title: property.title,
    siteUrl: contact.siteUrl,
    slug: property.slug,
    listingType: property.listingType,
  });

  const whatsappUrl = getWhatsAppUrl({
    phone: contact.whatsapp,
    message: whatsappMessage,
  });

  const inquirySubject = encodeURIComponent(
    `Consulta sobre: ${property.title}`,
  );
  const inquiryBody = encodeURIComponent(
    `Hola, me interesa obtener más información sobre "${property.title}".`,
  );
  const inquiryMailto =
    contact.email.length > 0
      ? `mailto:${contact.email}?subject=${inquirySubject}&body=${inquiryBody}`
      : null;

  return (
    <aside className="space-y-4 lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
      <div className="rounded-2xl border border-border-default bg-surface-card p-6">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">
          {getListingTypeLabel(property.listingType)}
        </p>
        <p className="mt-2 text-3xl font-semibold tracking-tight text-text-primary">
          {formatPrice(price.amount, price.currency)}
        </p>
        {price.label ? (
          <p className="mt-1 text-sm text-text-secondary">{price.label}</p>
        ) : null}

        {listing.expensesAmount != null && listing.expensesCurrency ? (
          <p className="mt-4 border-t border-border-default pt-4 text-sm text-text-primary">
            <span className="font-medium">Expensas:</span>{" "}
            {formatPrice(listing.expensesAmount, listing.expensesCurrency)}
          </p>
        ) : null}

        {listing.publishedAt ? (
          <p className="mt-3 text-sm text-text-secondary">
            Publicada el{" "}
            {new Intl.DateTimeFormat("es-AR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(new Date(listing.publishedAt))}
          </p>
        ) : null}

        <div className="mt-6 space-y-3 border-t border-border-default pt-6">
          {inquiryMailto ? (
            <a
              href={inquiryMailto}
              className="inline-flex w-full items-center justify-center rounded-xl border border-brand-green bg-brand-green px-4 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-green"
            >
              Solicitar información
            </a>
          ) : null}

          {whatsappUrl ? (
            <WhatsAppCTA
              href={whatsappUrl}
              variant={inquiryMailto ? "outline" : "primary"}
            />
          ) : null}
        </div>
      </div>

      <PropertyContactCard phone={contact.phone} email={contact.email} />
    </aside>
  );
}
