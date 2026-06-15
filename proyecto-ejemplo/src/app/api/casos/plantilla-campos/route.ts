import { getServerContext } from "@/lib/server/context/getServerContext";
import { casoTramiteService } from "@/lib/server/services/caso-tramite.service";
import { plantillaCamposCasoQuerySchema } from "@/lib/validation/schemas/plantilla-setup.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const plantillaIdRaw = searchParams.get("plantilla_id");
    const parsed = plantillaCamposCasoQuerySchema.safeParse({
      practica_id: searchParams.get("practica_id"),
      plantilla_id:
        plantillaIdRaw && plantillaIdRaw.trim() !== ""
          ? plantillaIdRaw
          : undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await casoTramiteService.getPlantillaCampos(
      ctx,
      parsed.data.practica_id,
      parsed.data.plantilla_id,
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
