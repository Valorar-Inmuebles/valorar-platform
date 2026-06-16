import { getServerContext } from "@/lib/server/context/getServerContext";
import { objetoService } from "@/lib/server/services/objeto.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fueroId = searchParams.get("fuero_id");

    if (!fueroId) {
      return Response.json(
        { error: "El parámetro 'fuero_id' es requerido" },
        { status: 422 },
      );
    }

    const ctx = await getServerContext();
    const data = await objetoService.getAllByFuero(ctx, fueroId);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
