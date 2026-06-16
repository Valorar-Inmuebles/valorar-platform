import { getServerContext } from "@/lib/server/context/getServerContext";
import { comentarioService } from "@/lib/server/services/comentario.service";
import { comentarioUsuariosMencionQuerySchema } from "@/lib/validation/schemas/comentario.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);
    const parsed = comentarioUsuariosMencionQuerySchema.safeParse({
      q: searchParams.get("q") ?? "",
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
        { status: 422 },
      );
    }

    const data = await comentarioService.listUsuariosMencion(ctx, parsed.data.q);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
