import type { Metadata } from "next";
import {
  ServicesBenefitsSection,
  ServicesCtaSection,
  ServicesGridSection,
  ServicesHero,
} from "@/components/services";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { createPageMetadata } from "@/lib/seo/metadata";
import { SERVICES_YEARS_EXPERIENCE } from "@/lib/services/services-content";

export const metadata: Metadata = createPageMetadata({
  title: "Servicios Inmobiliarios",
  description: `Servicios inmobiliarios integrales con más de ${SERVICES_YEARS_EXPERIENCE} años de experiencia: administración de alquileres, compra y venta, asesoramiento contable, jurídico y crediticio.`,
  path: "/servicios",
  openGraph: {
    images: [
      {
        url: BRAND_ASSETS.hero,
        width: 1920,
        height: 1080,
        alt: "Servicios Inmobiliarios",
      },
    ],
  },
});

export default function ServicesPage() {
  return (
    <>
      <ServicesHero />
      <ServicesBenefitsSection />
      <ServicesGridSection />
      <ServicesCtaSection />
    </>
  );
}
