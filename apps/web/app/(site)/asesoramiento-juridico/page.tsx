import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import { createStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createStaticPageMetadata(
  "Asesoramiento Jurídico",
  "Asesoramiento jurídico inmobiliario.",
  "/asesoramiento-juridico",
);

export default function LegalAdvisoryPage() {
  return (
    <PageShell
      title="Asesoramiento Jurídico"
      description="Contenido temporal sobre servicios de asesoramiento jurídico."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Asesoramiento Jurídico" },
      ]}
    />
  );
}
