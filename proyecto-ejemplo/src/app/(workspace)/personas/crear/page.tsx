import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { PersonaForm } from "@/components/modules/personas/persona-form";
import { SettingsContainer } from "@/components/layout/SettingsContainer";

export default async function NuevaPersonaPage() {
  await requireAuth();

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          title="Nueva Persona"
          breadcrumb={[
            { label: "Personas", href: "/personas" },
            { label: "Nueva" },
          ]}
        />

        <PersonaForm mode="create" />
      </div>
    </SettingsContainer>
  );
}
