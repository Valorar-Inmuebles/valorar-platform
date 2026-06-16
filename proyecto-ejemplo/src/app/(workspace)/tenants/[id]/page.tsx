import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { TenantForm } from "@/components/modules/tenants/TenantForm";

const BASE_PATH = "/tenants";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditTenantPage({ params }: Props) {
  const ctx = await requireAuth();

  if (!isSuperUsuario(ctx)) {
    return <p className="text-sm text-zinc-500">No autorizado</p>;
  }

  const { id } = await params;

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref={BASE_PATH}
          title="Editar tenant"
          breadcrumb={[
            { label: "Tenants", href: BASE_PATH },
            { label: "Editar" },
          ]}
        />

        <TenantForm mode="edit" id={id} basePath={BASE_PATH} />
      </div>
    </SettingsContainer>
  );
}
