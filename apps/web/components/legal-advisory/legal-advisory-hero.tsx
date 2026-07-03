import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { LEGAL_ADVISORY_HERO } from "@/lib/legal-advisory/legal-advisory-content";

export function LegalAdvisoryHero() {
  return (
    <section className="relative">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={BRAND_ASSETS.hero}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/40 to-black/55" />
      </div>

      <SiteContainer className="relative flex min-h-[380px] flex-col justify-end pb-12 pt-24 md:min-h-[460px] md:pb-16 md:pt-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          {LEGAL_ADVISORY_HERO.eyebrow}
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
          {LEGAL_ADVISORY_HERO.title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
          {LEGAL_ADVISORY_HERO.subtitle}
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
          {LEGAL_ADVISORY_HERO.intro}
        </p>
      </SiteContainer>
    </section>
  );
}
