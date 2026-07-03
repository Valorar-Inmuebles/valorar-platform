import { LocationIcon } from "@/components/icons";
import { SiteContainer } from "@/components/layout/site-container";
import { CONTACT_MAP } from "@/lib/contact/contact-content";

export function ContactMapSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {CONTACT_MAP.title}
          </h2>
          <p className="mt-2 text-text-secondary">{CONTACT_MAP.description}</p>
        </div>

        <div
          className="overflow-hidden rounded-2xl bg-surface-card ring-1 ring-border-default/80"
          data-map-slot="google-maps-future"
        >
          <div className="flex min-h-72 flex-col items-center justify-center px-6 py-12 text-center md:min-h-80">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
              <LocationIcon size={24} />
            </div>
            <p className="mt-4 text-base font-medium text-text-primary">
              {CONTACT_MAP.locationLabel}
            </p>
            <p className="mt-2 max-w-md text-sm text-text-secondary">
              Mapa de ubicación
            </p>
          </div>
        </div>
      </SiteContainer>
    </section>
  );
}
