import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { CampoForm } from "@/components/modules/campos/campo-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarCampoPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/campos"
          title="Editar campo"
          breadcrumb={[
            { label: "Biblioteca de campos", href: "/configuracion/campos" },
            { label: "Editar" },
          ]}
        />

        <CampoForm mode="edit" id={id} />
      </div>
    </SettingsContainer>
  );
}
