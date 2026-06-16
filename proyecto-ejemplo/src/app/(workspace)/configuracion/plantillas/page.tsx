import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { SettingsContainer } from "@/components/layout/SettingsContainer";
import { plantillasAdminService } from "@/lib/server/services/plantillas-admin.service";
import { PlantillasTable } from "@/components/modules/plantillas/plantillas-table";

export default async function PlantillasConfigPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);
  const plantillas = needsTenantSelection
    ? []
    : await plantillasAdminService.listForAdmin(ctx);

  return (
    <SettingsContainer>
      <div className="space-y-8">
        <PageHeader
          title="Plantillas"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Configuración", href: "/configuracion" },
            { label: "Plantillas" },
          ]}
        />

        {needsTenantSelection ? (
          <EmptyState
            title="Seleccioná un tenant"
            description="Usá el selector del encabezado para elegir un tenant y administrar sus plantillas."
          />
        ) : (
          <PlantillasTable plantillas={plantillas} />
        )}
      </div>
    </SettingsContainer>
  );
}
