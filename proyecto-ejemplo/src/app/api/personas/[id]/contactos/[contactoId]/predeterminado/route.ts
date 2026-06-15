import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaContactoService } from "@/lib/server/services/persona-contacto.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; contactoId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, contactoId } = await params;
    const body = await req.json();

    const { canal } = body as { canal: string };
    if (!canal) {
      return Response.json(
        { error: "El campo 'canal' es requerido" },
        { status: 422 },
      );
    }

    await personaContactoService.setPredeterminado(ctx, id, contactoId, canal);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
