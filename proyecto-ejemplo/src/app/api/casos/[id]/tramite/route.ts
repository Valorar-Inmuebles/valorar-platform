import { getServerContext } from "@/lib/server/context/getServerContext";
import { NotFoundError } from "@/lib/server/not-found-error";
import { casoTramiteService } from "@/lib/server/services/caso-tramite.service";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const querySchema = z.object({
  plantilla_id: z.string().uuid("plantilla_id inválido").optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const plantillaIdRaw = searchParams.get("plantilla_id");
    const parsed = querySchema.safeParse({
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

    const data = await casoTramiteService.getTramiteWithValores(
      ctx,
      id,
      parsed.data.plantilla_id,
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
