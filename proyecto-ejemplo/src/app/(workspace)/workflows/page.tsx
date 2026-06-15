import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkflowsList } from "@/components/modules/workflows/workflows-list";

export default async function WorkflowsPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workflows"
        breadcrumb={[
          { label: "Inicio", href: "/" },
          { label: "Workflows" },
        ]}
      />

      {needsTenantSelection ? (
        <EmptyState
          title="Seleccioná un tenant"
          description="Usá el selector del encabezado para elegir un tenant y administrar sus workflows."
        />
      ) : (
        <WorkflowsList />
      )}
    </div>
  );
}
