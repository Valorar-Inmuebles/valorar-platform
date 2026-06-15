import { requireAuth } from "@/lib/auth/require-auth";
import { PageHeader } from "@/components/ui/page-header";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { PlantillaForm } from "@/components/modules/plantillas/plantilla-form";
import { PLANTILLA_CONTEXTO_CASO } from "@/lib/validation/schemas/plantilla-setup.schema";

type Props = {
  searchParams: Promise<{
    contexto?: string;
    practica_id?: string;
  }>;
};

export default async function CrearPlantillaPage({ searchParams }: Props) {
  await requireAuth();
  const sp = await searchParams;

  const defaults = {
    contexto: sp.contexto ?? PLANTILLA_CONTEXTO_CASO,
    practica_id: sp.practica_id,
  };

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          back
          backHref="/configuracion/plantillas"
          title="Nueva plantilla"
          breadcrumb={[
            { label: "Plantillas", href: "/configuracion/plantillas" },
            { label: "Nueva" },
          ]}
        />

        <PlantillaForm mode="create" defaults={defaults} />
      </div>
    </SettingsContainer>
  );
}
