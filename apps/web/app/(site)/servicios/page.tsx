import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import { createStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createStaticPageMetadata(
  "Servicios",
  "Servicios inmobiliarios de la inmobiliaria.",
  "/servicios",
);

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
