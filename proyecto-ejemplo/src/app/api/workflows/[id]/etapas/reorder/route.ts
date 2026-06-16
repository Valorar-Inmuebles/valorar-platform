import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { reorderWorkflowEtapasSchema } from "@/lib/validation/schemas/workflow.schema";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: workflowId } = await params;

  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const parsed = reorderWorkflowEtapasSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.reorderEtapas(
      ctx,
      workflowId,
      parsed.data,
    );
    return Response.json(data);
  } catch (error: unknown) {
    console.error(
      "[PUT /api/workflows/[id]/etapas/reorder] Error al reordenar etapas",
      { workflowId, error },
    );
    return handleApiError(error, { request: req });
  }
}
