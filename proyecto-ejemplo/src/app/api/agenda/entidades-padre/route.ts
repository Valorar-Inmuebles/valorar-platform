import { getServerContext } from "@/lib/server/context/getServerContext";
import { agendaService } from "@/lib/server/services/agenda.service";
import { agendaEntidadesPadreQuerySchema } from "@/lib/validation/schemas/agenda.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const parsed = agendaEntidadesPadreQuerySchema.safeParse({
      entidad_tipo: searchParams.get("entidad_tipo") ?? undefined,
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
        { status: 422 },
      );
    }

    const data = await agendaService.listEntidadesPadre(
      ctx,
      parsed.data.entidad_tipo,
      parsed.data.q,
    );
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
