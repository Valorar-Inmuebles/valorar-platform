import { SiteContainer } from "@/components/layout/site-container";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { ContactForm } from "./contact-form";
import { ContactInfoCards } from "./contact-info-cards";

export function ContactMainSection() {
  const site = getPublicSiteConfig();

  return (
    <section className="bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <ContactForm />
          <ContactInfoCards whatsappFallbackPhone={site.whatsapp} />
        </div>
      </SiteContainer>
    </section>
  );
}
