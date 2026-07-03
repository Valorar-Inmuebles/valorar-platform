import { SiteContainer } from "@/components/layout/site-container";
import { ABOUT_COMMITMENT } from "@/lib/about/about-content";

export function AboutCommitmentSection() {
  return (
    <section className="bg-surface-base py-16 md:py-20">
      <SiteContainer>
        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 px-6 py-10 md:px-10 md:py-12">
          <h2 className="text-2xl font-semibold tracking-tight text-text-primary md:text-3xl">
            {ABOUT_COMMITMENT.title}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-text-secondary">
            {ABOUT_COMMITMENT.description}
          </p>
        </div>
      </SiteContainer>
    </section>
  );
}
