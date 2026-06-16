import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { TenantForm } from "@/components/modules/tenants/TenantForm";

export default async function CrearTenantPage() {
  const ctx = await requireAuth();

  if (!isSuperUsuario(ctx)) {
    return <p className="text-sm text-zinc-500">No autorizado</p>;
  }

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/tenants"
          title="Nuevo tenant"
          breadcrumb={[
            { label: "Tenants", href: "/configuracion/tenants" },
            { label: "Nuevo" },
          ]}
        />

        <TenantForm mode="create" />
      </div>
    </SettingsContainer>
  );
}
