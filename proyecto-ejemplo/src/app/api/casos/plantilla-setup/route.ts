import { getServerContext } from "@/lib/server/context/getServerContext";
import {
  plantillaSetupService,
  PlantillaSetupError,
} from "@/lib/server/services/plantilla-setup.service";
import { plantillaSetupSchema } from "@/lib/validation/schemas/plantilla-setup.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const parsed = plantillaSetupSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillaSetupService.createForCaso(ctx, parsed.data);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
