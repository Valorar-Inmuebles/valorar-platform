import { PlaceholderPanel } from "@/components/shared/placeholder-panel";

export default function ConfiguracionUsuariosPage() {
  return (
    <PlaceholderPanel
      title="Usuarios"
      description="Gestión de usuarios del tenant. Requiere auth y API — pendiente."
      breadcrumbs={[
        { label: "Inicio", href: "/" },
        { label: "Configuración", href: "/configuracion" },
        { label: "Usuarios" },
      ]}
    />
  );
}
