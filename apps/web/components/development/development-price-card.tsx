import type { PublicDevelopmentDetail } from "@repo/shared-types";
import { formatPrice } from "@/lib/format/price";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { PropertyContactCard } from "@/components/property/property-contact-card";
import { WhatsAppCTA } from "@/components/property/whatsapp-cta";

type DevelopmentPriceCardProps = {
  development: PublicDevelopmentDetail;
};

export function DevelopmentPriceCard({ development }: DevelopmentPriceCardProps) {
  const hasPrice =
    development.priceFrom != null && development.currency != null;

  const site = getPublicSiteConfig();
  const baseUrl = site.siteUrl.replace(/\/$/, "");
  const whatsappMessage = `Hola, me interesa el emprendimiento ${development.title} — ${baseUrl}/emprendimientos/${development.slug}`;
  const whatsappUrl = getWhatsAppUrl({
    phone: site.whatsapp,
    message: whatsappMessage,
  });

  return (
    <aside className="space-y-4 rounded-2xl bg-surface-card p-5 ring-1 ring-border-default lg:sticky lg:top-[calc(var(--header-height)+1rem)]">
      {hasPrice ? (
        <div>
          <p className="text-sm font-medium text-text-secondary">Precio desde</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-text-primary">
            {formatPrice(development.priceFrom!, development.currency!)}
          </p>
        </div>
      ) : null}

      {development.hasFinancing && development.financingDescription ? (
        <div className="rounded-xl bg-surface-alt p-4">
          <p className="text-sm font-medium text-text-primary">Financiación</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-text-secondary">
            {development.financingDescription}
          </p>
        </div>
      ) : null}

      {whatsappUrl ? <WhatsAppCTA href={whatsappUrl} variant="primary" /> : null}

      <PropertyContactCard phone={site.phone} email={site.email} />
    </aside>
  );
}
