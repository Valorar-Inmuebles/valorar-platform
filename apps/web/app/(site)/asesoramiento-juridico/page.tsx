import type { Metadata } from "next";
import {
  LegalAdvisoryAreasSection,
  LegalAdvisoryBenefitsSection,
  LegalAdvisoryCollaborationSection,
  LegalAdvisoryCtaSection,
  LegalAdvisoryHero,
  LegalAdvisoryPresentationSection,
} from "@/components/legal-advisory";
import { BRAND_ASSETS } from "@/lib/constants/brand";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Asesoramiento Jurídico",
  description:
    "Asesoramiento jurídico integral para operaciones inmobiliarias, sucesiones, derecho societario y propiedad intelectual.",
  path: "/asesoramiento-juridico",
  openGraph: {
    images: [
      {
        url: BRAND_ASSETS.hero,
        width: 1920,
        height: 1080,
        alt: "Asesoramiento Jurídico — Valorar Inmuebles",
      },
    ],
  },
});

export default function LegalAdvisoryPage() {
  return (
    <>
      <LegalAdvisoryHero />
      <LegalAdvisoryPresentationSection />
      <LegalAdvisoryAreasSection />
      <LegalAdvisoryBenefitsSection />
      <LegalAdvisoryCollaborationSection />
      <LegalAdvisoryCtaSection />
    </>
  );
}
