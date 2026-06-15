import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowService } from "@/lib/server/services/workflow.service";
import {
  createWorkflowSchema,
  workflowListQuerySchema,
} from "@/lib/validation/schemas/workflow.schema";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const parsed = workflowListQuerySchema.safeParse({
      origen: searchParams.get("origen") ?? undefined,
      estado: searchParams.get("estado") ?? undefined,
      workflow_tipo_id: searchParams.get("workflow_tipo_id") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.list(ctx, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const parsed = createWorkflowSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await workflowService.create(ctx, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
