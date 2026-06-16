import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { cloneWorkflowBodySchema } from "@/lib/validation/schemas/workflow.schema";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    let nombre: string | undefined;
    const body = await req.json().catch(() => ({}));
    const parsed = cloneWorkflowBodySchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }
    nombre = parsed.data.nombre;

    const data = await workflowService.clone(ctx, {
      source_workflow_id: id,
      nombre,
    });
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
