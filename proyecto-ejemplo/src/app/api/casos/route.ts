import { getServerContext } from "@/lib/server/context/getServerContext";
import { handleApiError } from "@/lib/server/api/handle-api-error";
import { casoService } from "@/lib/server/services/caso.service";
import { createCasoApiSchema } from "@/lib/validation/schemas/caso.schema";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await casoService.getAll(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = (await req.json()) as Record<string, unknown>;

    const parsed = createCasoApiSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { valores_dinamicos, tramite_plantilla_id, ...casoPayload } =
      parsed.data;

    const data = await casoService.create(ctx, casoPayload, {
      valores_dinamicos,
      tramite_plantilla_id,
    });
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
