import { getServerContext } from "@/lib/server/context/getServerContext";
import { agendaService } from "@/lib/server/services/agenda.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const ctx = await getServerContext();
    const { id } = await context.params;
    const data = await agendaService.listHistorial(ctx, id);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
