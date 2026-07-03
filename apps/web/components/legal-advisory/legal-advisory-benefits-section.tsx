import { Icon } from "@/components/icons";
import { SiteContainer } from "@/components/layout/site-container";
import { LEGAL_ADVISORY_BENEFITS } from "@/lib/legal-advisory/legal-advisory-content";

export function LegalAdvisoryBenefitsSection() {
  return (
    <section className="bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            ¿Por qué contar con asesoramiento?
          </h2>
          <p className="mt-3 text-base leading-relaxed text-text-secondary">
            El respaldo jurídico aporta claridad y previsibilidad en cada etapa
            de una operación inmobiliaria.
          </p>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 md:gap-6">
          {LEGAL_ADVISORY_BENEFITS.map((benefit) => (
            <article
              key={benefit.title}
              className="rounded-2xl border border-border-default bg-surface-card p-6 transition-colors duration-300 hover:border-brand-green/40 md:p-7"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green/10 text-brand-green">
                <Icon size={20} strokeWidth={2}>
                  <path d="M5 12l4 4L19 6" />
                </Icon>
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight text-text-primary">
                {benefit.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                {benefit.description}
              </p>
            </article>
          ))}
        </div>
      </SiteContainer>
    </section>
  );
}
