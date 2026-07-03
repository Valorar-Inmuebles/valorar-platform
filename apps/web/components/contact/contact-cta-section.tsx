import { SiteContainer } from "@/components/layout/site-container";
import { CONTACT_CTA } from "@/lib/contact/contact-content";

export function ContactCtaSection() {
  return (
    <section className="border-t border-border-default bg-surface-alt py-16 md:py-20">
      <SiteContainer>
        <div className="rounded-2xl bg-brand-green px-6 py-10 text-center md:px-12 md:py-14">
          <h2 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
            {CONTACT_CTA.title}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
            {CONTACT_CTA.description}
          </p>
          <a
            href={`#${CONTACT_CTA.targetId}`}
            className="mt-8 inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white px-8 text-sm font-semibold text-brand-green transition hover:bg-white/95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Contactanos
          </a>
        </div>
      </SiteContainer>
    </section>
  );
}
