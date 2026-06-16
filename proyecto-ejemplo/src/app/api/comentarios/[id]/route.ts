import { getServerContext } from "@/lib/server/context/getServerContext";
import { comentarioService } from "@/lib/server/services/comentario.service";
import { comentarioUpdateSchema } from "@/lib/validation/schemas/comentario.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = await req.json();
    const parsed = comentarioUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await comentarioService.update(ctx, id, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await comentarioService.remove(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
