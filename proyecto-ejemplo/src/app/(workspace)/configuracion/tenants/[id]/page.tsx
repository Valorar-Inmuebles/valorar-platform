import { requireAuth } from "@/lib/auth/require-auth";
import { isSuperUsuario } from "@/lib/auth/super-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { TenantForm } from "@/components/modules/tenants/TenantForm";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarTenantPage({ params }: Props) {
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
          backHref="/configuracion/tenants"
          title="Editar tenant"
          breadcrumb={[
            { label: "Tenants", href: "/configuracion/tenants" },
            { label: "Editar" },
          ]}
        />

        <TenantForm mode="edit" id={id} />
      </div>
    </SettingsContainer>
  );
}
