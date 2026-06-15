import { getServerContext } from "@/lib/server/context/getServerContext";
import { notificacionService } from "@/lib/server/services/notificacion.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

async function handleMarkAllAsRead(req: Request) {
  const ctx = await getServerContext();
  await notificacionService.markAllAsRead(ctx);
  return new Response(null, { status: 204 });
}

export async function PATCH(req: Request) {
  try {
    return await handleMarkAllAsRead(req);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    return await handleMarkAllAsRead(req);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
