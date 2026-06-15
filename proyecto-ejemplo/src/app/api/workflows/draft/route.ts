import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import { createDraftWorkflowSchema } from "@/lib/validation/schemas/workflow.schema";

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json().catch(() => ({}));

    const parsed = createDraftWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.createDraft(ctx, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
