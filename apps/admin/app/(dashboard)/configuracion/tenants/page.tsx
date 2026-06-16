import { PlaceholderPanel } from "@/components/shared/placeholder-panel";

export default function ConfiguracionTenantsPage() {
  return (
    <PlaceholderPanel
      title="Tenants"
      description="Gestión global de inmobiliarias (SUPER_ADMIN). Requiere auth y API — pendiente."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración", href: "/configuracion" },
        { label: "Tenants" },
      ]}
    />
  );
}
