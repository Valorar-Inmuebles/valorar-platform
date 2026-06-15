import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { ClienteForm } from "@/components/modules/clientes/ClienteForm";
import { SettingsContainer } from "@/components/layout/SettingsContainer";

export default async function CreateClientePage() {
  await requireAuth();

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/clientes"
          title="Nuevo Cliente"
          breadcrumb={[
            { label: "Clientes", href: "/clientes" },
            { label: "Nuevo" },
          ]}
        />

        <ClienteForm mode="create" />
      </div>
    </SettingsContainer>
  );
}