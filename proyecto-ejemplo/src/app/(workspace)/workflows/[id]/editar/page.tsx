import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/require-auth";
import { needsViewTenantSelection } from "@/lib/auth/view-tenant";
import { NotFoundError } from "@/lib/server/not-found-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { WorkflowWizard } from "@/components/modules/workflows/workflow-wizard";

const BASE_PATH = "/workflows";

const TENANT_EMPTY_DESCRIPTION =
  "Usá el selector del encabezado para elegir un tenant y editar workflows.";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditarWorkflowPage({ params }: Props) {
  const ctx = await requireAuth();
  const { id } = await params;
  const needsTenantSelection = needsViewTenantSelection(ctx);

  if (needsTenantSelection) {
    return (
      <div className="space-y-8">
        <PageHeader
          back
          backHref={BASE_PATH}
          title="Editar Workflow"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Workflows", href: BASE_PATH },
            { label: "Editar" },
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

  if (!workflow.editable) {
    return (
      <div className="space-y-8">
        <PageHeader
          back
          backHref={`${BASE_PATH}/${id}`}
          title="Editar Workflow"
          breadcrumb={[
            { label: "Inicio", href: "/" },
            { label: "Workflows", href: BASE_PATH },
            { label: workflow.nombre, href: `${BASE_PATH}/${id}` },
            { label: "Editar" },
          ]}
        />
        <EmptyState
          title="Workflow no editable"
          description="Este workflow no puede editarse porque está archivado o ya fue utilizado."
          action={
            <Link href={`${BASE_PATH}/${id}`}>
              <Button variant="secondary" size="sm">
                Volver a Ver
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <WorkflowWizard
      mode="edit"
      workflow={workflow}
      cancelHref={`${BASE_PATH}/${id}`}
    />
  );
}
