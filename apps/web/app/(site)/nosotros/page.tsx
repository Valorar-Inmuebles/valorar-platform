import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";

export const metadata: Metadata = {
  title: "Nosotros",
  description: "Conocé nuestra inmobiliaria.",
};

export default function AboutPage() {
  return (
    <PageShell
      title="Nosotros"
      description="Contenido temporal sobre la historia y valores de la inmobiliaria."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Nosotros" },
      ]}
    />
  );
}
