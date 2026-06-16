import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkflowWizard } from "@/components/modules/workflows/workflow-wizard";

const BASE_PATH = "/workflows";

const TENANT_EMPTY_DESCRIPTION =
  "Usá el selector del encabezado para elegir un tenant y crear workflows.";

export default async function CrearWorkflowPage() {
  const ctx = await requireAuth();
  const needsTenantSelection = needsViewTenantSelection(ctx);

  if (needsTenantSelection) {
    return (
      <div className="space-y-8">
        <PageHeader
          back
          backHref={BASE_PATH}
          title="Nuevo Workflow"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Workflows", href: BASE_PATH },
            { label: "Nuevo" },
          ]}
        />
        <EmptyState
          title="Seleccioná un tenant"
          description={TENANT_EMPTY_DESCRIPTION}
        />
      </div>
    );
  }

  return <WorkflowWizard mode="create" workflow={null} cancelHref={BASE_PATH} />;
}
