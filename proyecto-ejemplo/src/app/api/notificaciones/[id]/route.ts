import { getServerContext } from "@/lib/server/context/getServerContext";
import { notificacionService } from "@/lib/server/services/notificacion.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const data = await notificacionService.markAsRead(ctx, id);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
