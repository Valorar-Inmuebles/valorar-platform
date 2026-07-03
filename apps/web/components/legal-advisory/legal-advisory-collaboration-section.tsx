import { SiteContainer } from "@/components/layout/site-container";
import { LEGAL_ADVISORY_COLLABORATION } from "@/lib/legal-advisory/legal-advisory-content";

export function LegalAdvisoryCollaborationSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 px-6 py-10 md:px-10 md:py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {LEGAL_ADVISORY_COLLABORATION.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">
            {LEGAL_ADVISORY_COLLABORATION.description}
          </p>
        </div>
      </SiteContainer>
    </section>
  );
}
