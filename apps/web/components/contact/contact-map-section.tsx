import { Map } from "@/components/map";
import { SiteContainer } from "@/components/layout/site-container";
import { CONTACT_MAP, CONTACT_OFFICES } from "@/lib/contact/contact-content";

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

        <div className="grid gap-6 md:grid-cols-2">
          {CONTACT_OFFICES.map((office) => (
            <article key={office.id} className="space-y-3">
              <h3 className="text-lg font-semibold tracking-tight text-text-primary">
                {office.title}
              </h3>
              <p className="whitespace-pre-line text-sm text-text-secondary">
                {office.address}
              </p>
              <Map
                center={[office.latitude, office.longitude]}
                zoom={16}
                marker={{
                  position: [office.latitude, office.longitude],
                  title: office.title,
                }}
                className="h-64 w-full md:h-72"
                ariaLabel={`Mapa de ${office.title}`}
              />
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
