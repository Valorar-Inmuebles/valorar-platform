import type { Metadata } from "next";
import {
  ContactBenefitsSection,
  ContactCtaSection,
  ContactHero,
  ContactMainSection,
  ContactMapSection,
} from "@/components/contact";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Contacto",
  description:
    "Contactá a Valorar Inmuebles. Casa Central en Caballito y sucursal en Flores. Envianos tu consulta inmobiliaria.",
  path: "/contacto",
  openGraph: {
    images: [
      {
        url: BRAND_ASSETS.hero,
        width: 1920,
        height: 1080,
        alt: "Contacto — Valorar Inmuebles",
      },
    ],
  },
});

export default function ContactPage() {
  return (
    <>
      <ContactHero />
      <ContactMainSection />
      <ContactMapSection />
      <ContactBenefitsSection />
      <ContactCtaSection />
    </>
  );
}
