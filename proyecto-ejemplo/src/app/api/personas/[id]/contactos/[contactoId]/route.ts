import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaContactoService } from "@/lib/server/services/persona-contacto.service";
import { contactoSchema } from "@/lib/validation/schemas/persona-contacto.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; contactoId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, contactoId } = await params;
    const body = await req.json();

    const parsed = contactoSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await personaContactoService.update(ctx, id, contactoId, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; contactoId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, contactoId } = await params;

    await personaContactoService.delete(ctx, id, contactoId);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
