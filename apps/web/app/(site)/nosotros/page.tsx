import type { Metadata } from "next";
import {
  AboutCommitmentSection,
  AboutCtaSection,
  AboutDirectorSection,
  AboutHero,
  AboutHistorySection,
  AboutWorkStyleSection,
} from "@/components/about";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { ABOUT_YEARS_EXPERIENCE } from "@/lib/about/about-content";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Nosotros",
  description: `Conocé la historia de Valorar Inmuebles: más de ${ABOUT_YEARS_EXPERIENCE} años acompañando operaciones inmobiliarias en Caballito y la Ciudad de Buenos Aires.`,
  path: "/nosotros",
  openGraph: {
    images: [
      {
        url: BRAND_ASSETS.hero,
        width: 1920,
        height: 1080,
        alt: "Nosotros — Valorar Inmuebles",
      },
    ],
  },
});

export default function AboutPage() {
  return (
    <>
      <AboutHero />
      <AboutHistorySection />
      <AboutWorkStyleSection />
      <AboutCommitmentSection />
      <AboutDirectorSection />
      <AboutCtaSection />
    </>
  );
}
