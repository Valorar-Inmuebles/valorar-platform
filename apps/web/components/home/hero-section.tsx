import { SiteContainer } from "@/components/layout/site-container";

import { BRAND_ASSETS } from "@/lib/constants/brand";

import { HERO_SEARCH_MAX_WIDTH } from "@/lib/constants/hero";

import { getInventorySearchCoverage } from "@/lib/inventory/get-inventory-search-coverage";

import Image from "next/image";

import { PropertySearchForm } from "./property-search-form";



export async function HeroSection() {

  const coverage = await getInventorySearchCoverage("properties");



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

        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/35 to-black/50" />

      </div>



      <SiteContainer className="relative flex min-h-[520px] flex-col justify-end pb-10 pt-24 md:min-h-[620px] md:pb-14 md:pt-28">

        <div className="mx-auto w-full" style={{ maxWidth: HERO_SEARCH_MAX_WIDTH }}>

          <p className="text-center text-xs font-medium uppercase tracking-[0.2em] text-white/70 md:text-left">

            Portal inmobiliario

          </p>

          <h1 className="mt-3 text-center text-3xl font-semibold tracking-tight text-white md:text-left md:text-4xl lg:text-5xl">

            Encontrá tu próximo hogar

          </h1>

          <p className="mt-3 text-center text-sm text-white/75 md:text-left md:text-base">

            Buscá por provincia, localidad, tipo y operación en todo el país.

          </p>



          <div className="relative z-30 mt-8 md:mt-10">

            <PropertySearchForm coverage={coverage} />

          </div>

        </div>

      </SiteContainer>

    </section>

  );

}

