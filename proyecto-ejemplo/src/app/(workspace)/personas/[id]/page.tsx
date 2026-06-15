import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { PersonaForm } from "@/components/modules/personas/persona-form";
import { SettingsContainer } from "@/components/layout/SettingsContainer";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarPersonaPage({ params }: Props) {
  await requireAuth();

  const { id } = await params;

  return (
    <SettingsContainer>
      <div className="space-y-8">

        <PageHeader
          back 
          backHref="/personas"
          title="Editar Persona"
          breadcrumb={[
            { label: "Personas", href: "/personas" },
            { label: "Editar" },
          ]}
        />

        <PersonaForm mode="edit" id={id} />

      </div>
    </SettingsContainer>
  );
}