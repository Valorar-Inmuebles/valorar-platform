import { getServerContext } from "@/lib/server/context/getServerContext";
import { casoPlantillasService } from "@/lib/server/services/caso-plantillas.service";
import { plantillaCamposCasoQuerySchema } from "@/lib/validation/schemas/plantilla-setup.schema";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const querySchema = plantillaCamposCasoQuerySchema.extend({
  include_plantilla_id: z.string().uuid("include_plantilla_id inválido").optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const includeRaw = searchParams.get("include_plantilla_id");
    const parsed = querySchema.safeParse({
      practica_id: searchParams.get("practica_id"),
      include_plantilla_id:
        includeRaw && includeRaw.trim() !== "" ? includeRaw : undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await casoPlantillasService.listDisponiblesForPractica(
      ctx,
      parsed.data.practica_id,
      { includePlantillaId: parsed.data.include_plantilla_id },
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
