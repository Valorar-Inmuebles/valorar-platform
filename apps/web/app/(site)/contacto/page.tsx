import type { Metadata } from "next";
import { PageShell } from "@/components/content/page-shell";
import { FOOTER_CONTACT } from "@/lib/constants/navigation";
import { createStaticPageMetadata } from "@/lib/seo/metadata";
import { getPublicSiteConfig } from "@/lib/tenant/site-config";

export const metadata: Metadata = createStaticPageMetadata(
  "Contacto",
  "Contactanos para consultas sobre propiedades y servicios.",
  "/contacto",
);

export default function ContactPage() {
  const site = getPublicSiteConfig();

  return (
    <PageShell
      title="Contacto"
      description="Contenido temporal. El formulario de contacto se integrará con el dominio Lead."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Contacto" },
      ]}
    >
      <div className="max-w-lg space-y-4 rounded-lg border border-border bg-background p-6 text-sm text-foreground">
        <p>
          <span className="font-medium">Teléfono:</span>{" "}
          {site.phone || FOOTER_CONTACT.phone}
        </p>
        <p>
          <span className="font-medium">Email:</span>{" "}
          {site.email || FOOTER_CONTACT.email}
        </p>
        <p>
          <span className="font-medium">Dirección:</span>{" "}
          {site.address || FOOTER_CONTACT.address}
        </p>
        <p>
          <span className="font-medium">Horario:</span> {FOOTER_CONTACT.hours}
        </p>
      </div>
    </PageShell>
  );
}
