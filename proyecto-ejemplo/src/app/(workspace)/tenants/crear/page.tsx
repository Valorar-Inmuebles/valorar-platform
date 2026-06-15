import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { TenantForm } from "@/components/modules/tenants/TenantForm";

const BASE_PATH = "/tenants";

export default async function CreateTenantPage() {
  const ctx = await requireAuth();

  if (!isSuperUsuario(ctx)) {
    return <p className="text-sm text-zinc-500">No autorizado</p>;
  }

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref={BASE_PATH}
          title="Nuevo tenant"
          breadcrumb={[
            { label: "Tenants", href: BASE_PATH },
            { label: "Nuevo" },
          ]}
        />

        <TenantForm mode="create" basePath={BASE_PATH} />
      </div>
    </SettingsContainer>
  );
}
