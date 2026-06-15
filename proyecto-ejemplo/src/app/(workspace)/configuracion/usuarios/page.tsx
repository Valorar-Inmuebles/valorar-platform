import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { usuarioService } from "@/lib/server/services/usuario.service";
import { UsuariosTable } from "@/components/modules/usuarios/usuarios-table";

export default async function UsuariosPage() {
  const ctx = await requireAuth();
  const usuarios = await usuarioService.getAll(ctx);
  const showTenantColumn = isSuperUsuario(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Usuarios"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Usuarios" },
        ]}
      />

      <UsuariosTable usuarios={usuarios} showTenantColumn={showTenantColumn} />
    </div>
  );
}
