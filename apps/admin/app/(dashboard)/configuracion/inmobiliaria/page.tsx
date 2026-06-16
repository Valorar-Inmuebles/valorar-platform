import { PlaceholderPanel } from "@/components/shared/placeholder-panel";

export default function ConfiguracionInmobiliariaPage() {
  return (
    <PlaceholderPanel
      title="Inmobiliaria"
      description="Branding y datos del tenant. Requiere auth y API — pendiente."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración", href: "/configuracion" },
        { label: "Inmobiliaria" },
      ]}
    />
  );
}
