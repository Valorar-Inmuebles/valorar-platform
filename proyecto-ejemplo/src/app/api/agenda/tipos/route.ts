import { getServerContext } from "@/lib/server/context/getServerContext";
import { agendaService } from "@/lib/server/services/agenda.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await agendaService.listTipos(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
