import { getServerContext } from "@/lib/server/context/getServerContext";
import { plantillasService } from "@/lib/server/services/plantillas.service";
import { plantillasAdminService } from "@/lib/server/services/plantillas-admin.service";
import { PlantillaSetupError } from "@/lib/server/services/plantilla-setup.service";
import { createPlantillaAdminSchema } from "@/lib/validation/schemas/plantilla-admin.schema";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const querySchema = z.object({
  contexto: z.string().min(1, "contexto es requerido"),
});

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const parsed = querySchema.safeParse({
      contexto: searchParams.get("contexto"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillasService.listByContexto(
      ctx,
      parsed.data.contexto,
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const parsed = createPlantillaAdminSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillasAdminService.create(ctx, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
