import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";

export const metadata: Metadata = {
  title: "Asesoramiento Jurídico",
  description: "Asesoramiento jurídico inmobiliario.",
};

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
