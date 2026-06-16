import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { PlantillaForm } from "@/components/modules/plantillas/plantilla-form";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarPlantillaPage({ params }: Props) {
  await requireAuth();
  const { id } = await params;

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/plantillas"
          title="Editar plantilla"
          breadcrumb={[
            { label: "Plantillas", href: "/configuracion/plantillas" },
            { label: "Editar" },
          ]}
        />

        <PlantillaForm mode="edit" id={id} />
      </div>
    </SettingsContainer>
  );
}
