import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { CampoForm } from "@/components/modules/campos/campo-form";

export default async function CrearCampoPage() {
  await requireAuth();

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/campos"
          title="Nuevo campo"
          breadcrumb={[
            { label: "Biblioteca de campos", href: "/configuracion/campos" },
            { label: "Nuevo" },
          ]}
        />

        <CampoForm mode="create" />
      </div>
    </SettingsContainer>
  );
}
