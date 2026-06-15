import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { camposDinamicosService } from "@/lib/server/services/campos-dinamicos.service";
import { CamposTable } from "@/components/modules/campos/campos-table";

const CASO_CONTEXTO = "caso";

export default async function BibliotecaCamposPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);
  const campos = needsTenantSelection
    ? []
    : await camposDinamicosService.listForAdmin(ctx, CASO_CONTEXTO);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Biblioteca de campos"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Configuración", href: "/configuracion" },
          { label: "Campos" },
        ]}
      />

      {needsTenantSelection ? (
        <EmptyState
          title="Seleccioná un tenant"
          description="Usá el selector del encabezado para elegir un tenant y administrar sus campos."
        />
      ) : (
        <CamposTable campos={campos} />
      )}
    </div>
  );
}
