import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { PropertySearchForm } from "./property-search-form";

export function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0">
        <Image
          src={BRAND_ASSETS.hero}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/30" />
      </div>

      <SiteContainer className="relative z-10 flex min-h-[560px] flex-col justify-center py-16 md:min-h-[640px] md:py-24">
        <div className="max-w-3xl text-white">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl">
            Encontrá tu próximo hogar o inversión
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/85 md:text-xl">
            Te acompañamos en cada paso.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <PropertySearchForm />
        </div>
      </SiteContainer>
    </section>
  );
}
