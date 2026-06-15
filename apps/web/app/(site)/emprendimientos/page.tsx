import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";

export const metadata: Metadata = {
  title: "Emprendimientos",
  description: "Emprendimientos inmobiliarios y unidades disponibles.",
  robots: {
    index: false,
    follow: true,
  },
};

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
