import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { reorderWorkflowParteCamposDinamicosSchema } from "@/lib/validation/schemas/workflow.schema";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; parteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, parteId } = await params;
    const body = await req.json();

    const parsed = reorderWorkflowParteCamposDinamicosSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.reorderParteCamposDinamicos(
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
