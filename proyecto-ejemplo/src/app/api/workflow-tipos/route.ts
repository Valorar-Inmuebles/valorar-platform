import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { workflowTipoService } from "@/lib/server/services/workflow-tipo.service";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await workflowTipoService.getAllActive(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
