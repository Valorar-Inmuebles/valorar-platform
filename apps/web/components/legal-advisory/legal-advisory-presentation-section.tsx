import { SiteContainer } from "@/components/layout/site-container";
import { LEGAL_ADVISORY_PRESENTATION } from "@/lib/legal-advisory/legal-advisory-content";

export function LegalAdvisoryPresentationSection() {
  return (
    <section className="bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-brand-orange">
            Presentación
          </p>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {LEGAL_ADVISORY_PRESENTATION.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed text-text-secondary md:text-lg">
            {LEGAL_ADVISORY_PRESENTATION.description}
          </p>
        </div>
      </SiteContainer>
    </section>
  );
}
