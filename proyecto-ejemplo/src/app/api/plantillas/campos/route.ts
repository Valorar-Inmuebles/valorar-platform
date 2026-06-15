import { getServerContext } from "@/lib/server/context/getServerContext";
import { plantillasService } from "@/lib/server/services/plantillas.service";
import {
  plantillaCamposCasoQuerySchema,
  plantillaCamposExpedienteQuerySchema,
  PLANTILLA_CONTEXTO_CASO,
  PLANTILLA_CONTEXTO_EXPEDIENTE,
} from "@/lib/validation/schemas/plantilla-setup.schema";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const querySchema = z.discriminatedUnion("contexto", [
  plantillaCamposCasoQuerySchema.extend({
    contexto: z.literal(PLANTILLA_CONTEXTO_CASO),
  }),
  plantillaCamposExpedienteQuerySchema.extend({
    contexto: z.literal(PLANTILLA_CONTEXTO_EXPEDIENTE),
  }),
]);

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const plantillaIdRaw = searchParams.get("plantilla_id");
    const parsed = querySchema.safeParse({
      contexto: searchParams.get("contexto"),
      practica_id: searchParams.get("practica_id"),
      fuero_id: searchParams.get("fuero_id"),
      objeto_id: searchParams.get("objeto_id"),
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

    const data =
      parsed.data.contexto === PLANTILLA_CONTEXTO_CASO
        ? await plantillasService.resolveCamposForCaso(
            ctx,
            parsed.data.practica_id,
            parsed.data.plantilla_id,
          )
        : await plantillasService.resolveCamposForExpediente(
            ctx,
            parsed.data.fuero_id,
            parsed.data.objeto_id,
            parsed.data.plantilla_id,
          );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
