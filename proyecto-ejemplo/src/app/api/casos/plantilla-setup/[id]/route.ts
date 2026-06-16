import { getServerContext } from "@/lib/server/context/getServerContext";
import { plantillaSetupService } from "@/lib/server/services/plantilla-setup.service";
import {
  updatePlantillaSetupSchema,
  plantillaSetupReglaQuerySchema,
} from "@/lib/validation/schemas/plantilla-setup.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const parsed = plantillaSetupReglaQuerySchema.safeParse({
      practica_id: searchParams.get("practica_id"),
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillaSetupService.getForEditCaso(
      ctx,
      id,
      parsed.data.practica_id,
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();
    const { id } = await params;

    const parsed = updatePlantillaSetupSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillaSetupService.updateForCaso(
      ctx,
      id,
      parsed.data,
    );

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
