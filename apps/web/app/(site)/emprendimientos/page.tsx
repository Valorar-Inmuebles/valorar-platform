import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import { createPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createPageMetadata({
  title: "Emprendimientos",
  description: "Emprendimientos inmobiliarios y unidades disponibles.",
  path: "/emprendimientos",
  noIndex: true,
});

export default function DevelopmentsPage() {
  return (
    <PageShell
      title="Emprendimientos"
      description="Esta sección estará disponible cuando se implemente el dominio Development y su API pública."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Emprendimientos" },
      ]}
    />
  );
}
