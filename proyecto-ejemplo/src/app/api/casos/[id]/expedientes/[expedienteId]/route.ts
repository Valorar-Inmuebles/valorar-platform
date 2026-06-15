import { getServerContext } from "@/lib/server/context/getServerContext";
import { NotFoundError } from "@/lib/server/not-found-error";
import { casoExpedienteService } from "@/lib/server/services/caso-expediente.service";
import { updateCasoExpedienteSchema } from "@/lib/validation/schemas/caso-expediente.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; expedienteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, expedienteId } = await params;
    const body = await req.json();

    const parsed = updateCasoExpedienteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    await casoExpedienteService.update(
      ctx,
      id,
      expedienteId,
      parsed.data,
    );
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; expedienteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, expedienteId } = await params;

    await casoExpedienteService.delete(ctx, id, expedienteId);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
