import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesCrucesService } from "@/lib/server/services/anses-cruces.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await ansesCrucesService.getCruces(ctx);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
