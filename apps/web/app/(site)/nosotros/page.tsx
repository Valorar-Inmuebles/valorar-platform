import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import { createStaticPageMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = createStaticPageMetadata(
  "Nosotros",
  "Conocé nuestra inmobiliaria.",
  "/nosotros",
);

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
