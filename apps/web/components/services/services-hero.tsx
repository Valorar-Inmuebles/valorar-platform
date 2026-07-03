import Image from "next/image";
import Link from "next/link";
import { SiteContainer } from "@/components/layout/site-container";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { SERVICES_YEARS_EXPERIENCE } from "@/lib/services/services-content";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";
import { getWhatsAppUrl } from "@/lib/tenant/get-whatsapp-url";

export function ServicesHero() {
  const site = getPublicSiteConfig();
  const whatsappUrl = getWhatsAppUrl({
    phone: site.whatsapp,
    message: "Hola, me gustaría solicitar asesoramiento sobre sus servicios inmobiliarios.",
  });

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

      <SiteContainer className="relative flex min-h-[420px] flex-col justify-end pb-12 pt-24 md:min-h-[500px] md:pb-16 md:pt-28">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/70">
          Servicios
        </p>
        <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-4xl lg:text-5xl">
          Servicios Inmobiliarios
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/80 md:text-base">
          Más de {SERVICES_YEARS_EXPERIENCE} años acompañando operaciones
          inmobiliarias con un servicio integral para propietarios, compradores,
          inversores, desarrolladores y consorcios.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          {whatsappUrl ? (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-green px-8 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Solicitar asesoramiento
            </a>
          ) : (
            <Link
              href="/contacto"
              className="inline-flex h-12 items-center justify-center rounded-xl bg-brand-green px-8 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Solicitar asesoramiento
            </Link>
          )}

          <Link
            href="/contacto"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-white/70 bg-white/5 px-8 text-sm font-semibold text-white transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Contactanos
          </Link>
        </div>
      </SiteContainer>
    </section>
  );
}
