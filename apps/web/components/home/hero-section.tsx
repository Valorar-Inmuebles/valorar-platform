import { Playfair_Display } from "next/font/google";
import Image from "next/image";
import { SiteContainer } from "@/components/layout/site-container";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { HERO_SEARCH_MAX_WIDTH } from "@/lib/constants/hero";
import { PropertySearchForm } from "./property-search-form";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
});

export function HeroSection() {
  return (
    <section className="relative z-20">
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={BRAND_ASSETS.hero}
          alt=""
          fill
          priority
          className="object-cover"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
      </div>

      <SiteContainer className="relative flex min-h-[580px] flex-col justify-center py-20 md:min-h-[680px] md:py-28 lg:py-32">
        <div className="max-w-2xl">
          <h1
            className={`${playfair.className} text-[2.75rem] font-medium leading-[1.05] tracking-tight text-white md:text-5xl lg:text-[3.5rem] xl:text-6xl`}
          >
            Encontrá tu próximo
            <br />
            hogar o inversión
          </h1>
          <p className="mt-6 max-w-lg text-base font-normal leading-relaxed text-white/80 md:text-lg">
            Te acompañamos en cada paso.
          </p>
        </div>

        <div
          className="relative z-30 mx-auto mt-12 w-full md:mt-16 lg:mt-20"
          style={{ maxWidth: HERO_SEARCH_MAX_WIDTH }}
        >
          <PropertySearchForm />
        </div>
      </SiteContainer>
    </section>
  );
}
