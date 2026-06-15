import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { tenantService } from "@/lib/server/services/tenant.service";
import { TenantsTable } from "@/components/modules/tenants/tenants-table";

export default async function ConfiguracionTenantsPage() {
  const ctx = await requireAuth();

  if (!isSuperUsuario(ctx)) {
    return <p className="text-sm text-zinc-500">No autorizado</p>;
  }

  const tenants = await tenantService.getAll(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tenants"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Tenants" },
        ]}
      />

      <TenantsTable tenants={tenants} />
    </div>
  );
}
