import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

type RouteParams = { id: string };

export async function PUT(
  req: Request,
  { params }: { params: Promise<RouteParams> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = (await req.json()) as { activa?: unknown };
    const activa = body.activa === true;

    await ansesService.updateSincronizarAnses(ctx, id, activa);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
