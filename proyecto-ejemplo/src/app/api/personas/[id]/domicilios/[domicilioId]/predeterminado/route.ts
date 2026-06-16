import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaDomicilioService } from "@/lib/server/services/persona-domicilio.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; domicilioId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, domicilioId } = await params;

    await personaDomicilioService.setPredeterminado(ctx, id, domicilioId);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
