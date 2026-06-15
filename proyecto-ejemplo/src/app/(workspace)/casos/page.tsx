import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { CasosTable } from "@/components/modules/casos/casos-table";
import { casoService } from "@/lib/server/services/caso.service";

export default async function CasosPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);
  const casos = needsTenantSelection ? [] : await casoService.getAll(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Casos"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Casos" },
        ]}
      />

      {needsTenantSelection ? (
        <EmptyState
          title="Seleccioná un tenant"
          description="Usá el selector del encabezado para elegir un tenant y ver sus casos."
        />
      ) : (
        <CasosTable casos={casos} />
      )}
    </div>
  );
}
