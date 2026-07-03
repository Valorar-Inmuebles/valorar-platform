import { SiteContainer } from "@/components/layout/site-container";
import { LEGAL_ADVISORY_AREAS } from "@/lib/legal-advisory/legal-advisory-content";
import { LegalAdvisoryAreaIcon } from "./legal-advisory-area-icon";

export function LegalAdvisoryAreasSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            Áreas de asesoramiento
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">
            Cuatro áreas de práctica que cubren las consultas jurídicas más
            frecuentes en el ámbito inmobiliario.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:gap-6">
          {LEGAL_ADVISORY_AREAS.map((area) => (
            <article
              key={area.title}
              className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <LegalAdvisoryAreaIcon name={area.icon} size={20} />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-text-primary">
                {area.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {area.description}
              </p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
