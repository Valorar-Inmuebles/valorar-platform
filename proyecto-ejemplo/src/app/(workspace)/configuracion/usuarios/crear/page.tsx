import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { UsuarioForm } from "@/components/modules/usuarios/usuario-form";

export default async function CrearUsuarioPage() {
  const ctx = await requireAuth();

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/usuarios"
          title="Nuevo usuario"
          breadcrumb={[
            { label: "Usuarios", href: "/configuracion/usuarios" },
            { label: "Nuevo" },
          ]}
        />

        <UsuarioForm mode="create" isSuperUsuario={isSuperUsuario(ctx)} />
      </div>
    </SettingsContainer>
  );
}
