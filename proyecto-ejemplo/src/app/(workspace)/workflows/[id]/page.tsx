import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { NotFoundError } from "@/lib/server/not-found-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { WorkflowWizard } from "@/components/modules/workflows/workflow-wizard";

const BASE_PATH = "/workflows";

const TENANT_EMPTY_DESCRIPTION =
  "Usá el selector del encabezado para elegir un tenant y ver workflows.";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function VerWorkflowPage({ params }: Props) {
  const ctx = await requireAuth();
  const { id } = await params;
  const needsTenantSelection = needsViewTenantSelection(ctx);

  if (needsTenantSelection) {
    return (
      <div className="space-y-8">
        <PageHeader
          back
          backHref={BASE_PATH}
          title="Ver Workflow"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Workflows", href: BASE_PATH },
            { label: "Ver" },
          ]}
        />
        <EmptyState
          title="Seleccioná un tenant"
          description={TENANT_EMPTY_DESCRIPTION}
        />
      </div>
    );
  }

  let workflow;
  try {
    workflow = await workflowService.getById(ctx, id);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }

  return (
    <WorkflowWizard
      mode="view"
      workflow={workflow}
      cancelHref={BASE_PATH}
    />
  );
}
