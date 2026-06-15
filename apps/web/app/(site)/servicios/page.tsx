import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";

export const metadata: Metadata = {
  title: "Servicios",
  description: "Servicios inmobiliarios de la inmobiliaria.",
};

export default function ServicesPage() {
  return (
    <PageShell
      title="Servicios"
      description="Contenido temporal. Los servicios se documentarán en futuras iteraciones."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Servicios" },
      ]}
    />
  );
}
