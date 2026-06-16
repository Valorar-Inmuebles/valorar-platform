import { getServerContext } from "@/lib/server/context/getServerContext";
import { localidadService } from "@/lib/server/services/localidad.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const provinciaId = searchParams.get("provincia_id");

    if (!provinciaId) {
      return Response.json(
        { error: "El parámetro 'provincia_id' es requerido" },
        { status: 422 },
      );
    }

    const ctx = await getServerContext();
    const data = await localidadService.getAllByProvincia(ctx, provinciaId);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
