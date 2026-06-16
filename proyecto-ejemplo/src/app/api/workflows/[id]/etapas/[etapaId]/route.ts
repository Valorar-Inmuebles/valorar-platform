import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { updateWorkflowEtapaSchema } from "@/lib/validation/schemas/workflow.schema";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; etapaId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, etapaId } = await params;
    const body = await req.json();

    const parsed = updateWorkflowEtapaSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.updateEtapa(
      ctx,
      id,
      etapaId,
      parsed.data,
    );
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; etapaId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, etapaId } = await params;

    const data = await workflowService.deleteEtapa(ctx, id, etapaId);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
