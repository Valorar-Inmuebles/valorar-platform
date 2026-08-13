import { Map } from "@/components/map";
import { SiteContainer } from "@/components/layout/site-container";
import {
  CONTACT_BRANCHES_SECTION_ID,
  CONTACT_MAP,
  CONTACT_OFFICES,
} from "@/lib/contact/contact-content";
import { BranchOfficeCard } from "./branch-office-card";

export function ContactMapSection() {
  return (
    <section
      id={CONTACT_BRANCHES_SECTION_ID}
      className="scroll-mt-24 border-t border-border-default bg-surface-alt py-16 md:py-20"
    >
      <SiteContainer>
        <div className="mb-8 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {CONTACT_MAP.title}
          </h2>
          <p className="mt-2 text-text-secondary">{CONTACT_MAP.description}</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {CONTACT_OFFICES.map((office) => (
            <BranchOfficeCard key={office.id} office={office}>
              <Map
                center={[office.latitude, office.longitude]}
                zoom={16}
                marker={{
                  position: [office.latitude, office.longitude],
                  title: office.title,
                }}
                framed={false}
                className="h-64 w-full border-t border-border-default md:h-72"
                ariaLabel={`Mapa de ${office.title}`}
              />
            </BranchOfficeCard>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
