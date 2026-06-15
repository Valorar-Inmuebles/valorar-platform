import { getServerContext } from "@/lib/server/context/getServerContext";
import { codigoPostalService } from "@/lib/server/services/codigo-postal.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const localidadId = searchParams.get("localidad_id");

    if (!localidadId) {
      return Response.json(
        { error: "El parámetro 'localidad_id' es requerido" },
        { status: 422 },
      );
    }

    const ctx = await getServerContext();
    const data = await codigoPostalService.getAllByLocalidad(ctx, localidadId);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
