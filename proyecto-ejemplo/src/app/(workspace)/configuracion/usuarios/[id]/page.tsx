import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { UsuarioForm } from "@/components/modules/usuarios/usuario-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarUsuarioPage({ params }: Props) {
  const ctx = await requireAuth();
  const { id } = await params;

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/usuarios"
          title="Editar usuario"
          breadcrumb={[
            { label: "Usuarios", href: "/configuracion/usuarios" },
            { label: "Editar" },
          ]}
        />

        <UsuarioForm
          mode="edit"
          id={id}
          isSuperUsuario={isSuperUsuario(ctx)}
        />
      </div>
    </SettingsContainer>
  );
}
