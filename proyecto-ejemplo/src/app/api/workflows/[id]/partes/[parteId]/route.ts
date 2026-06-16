import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { updateWorkflowParteSchema } from "@/lib/validation/schemas/workflow.schema";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; parteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, parteId } = await params;
    const body = await req.json();

    const parsed = updateWorkflowParteSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.updateParte(
      ctx,
      id,
      parteId,
      parsed.data,
    );
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; parteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, parteId } = await params;

    const data = await workflowService.deleteParte(ctx, id, parteId);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
