import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";

export const metadata: Metadata = {
  title: "Propiedades",
  description: "Listado de propiedades en venta y alquiler.",
};

export default function PropertiesPage() {
  return (
    <PageShell
      title="Propiedades"
      description="El listado de propiedades se implementará en la Fase 3 del roadmap."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Propiedades" },
      ]}
    />
  );
}
