import { getServerContext } from "@/lib/server/context/getServerContext";
import { localidadService } from "@/lib/server/services/localidad.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const MIN_QUERY_LENGTH = 2;
const MAX_RESULTS = 50;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const provinciaId = searchParams.get("provincia_id");
    const q = searchParams.get("q") ?? "";

    if (!provinciaId) {
      return Response.json(
        { error: "El parámetro 'provincia_id' es requerido" },
        { status: 422 },
      );
    }

    if (q.trim().length < MIN_QUERY_LENGTH) {
      return Response.json([]);
    }

    const ctx = await getServerContext();
    const data = await localidadService.search(ctx, provinciaId, q.trim(), MAX_RESULTS);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
