import { getServerContext } from "@/lib/server/context/getServerContext";
import { jurisdiccionService } from "@/lib/server/services/jurisdiccion.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await jurisdiccionService.getAll(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
