import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { clienteService } from "@/lib/server/services/cliente.service";
import { ClientesTable } from "@/components/modules/clientes/clientes-table";

export default async function ClientesPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);
  const clientes = needsTenantSelection ? [] : await clienteService.getAll(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clientes"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Clientes" },
        ]}
      />

      {needsTenantSelection ? (
        <EmptyState
          title="Seleccioná un tenant"
          description="Usá el selector del encabezado para elegir un tenant y ver sus clientes."
        />
      ) : (
        <ClientesTable clientes={clientes} />
      )}
    </div>
  );
}
