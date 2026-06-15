import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

type RouteParams = { id: string };

export async function POST(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await ansesService.triggerClienteSync(ctx, id);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
