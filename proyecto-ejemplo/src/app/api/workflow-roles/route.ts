import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowRolService } from "@/lib/server/services/workflow-rol.service";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await workflowRolService.getAllActive(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
