import { getServerContext } from "@/lib/server/context/getServerContext";
import { NotFoundError } from "@/lib/server/not-found-error";
import { plantillasAdminService } from "@/lib/server/services/plantillas-admin.service";
import { PlantillaSetupError } from "@/lib/server/services/plantilla-setup.service";
import { updatePlantillaAdminSchema } from "@/lib/validation/schemas/plantilla-admin.schema";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const patchSchema = z.object({
  activo: z.boolean(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await plantillasAdminService.getDetail(ctx, id);
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
    const { id } = await params;
    const body = await req.json();

    const parsed = updatePlantillaAdminSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await plantillasAdminService.update(ctx, id, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    await plantillasAdminService.setActivo(ctx, id, parsed.data.activo);
    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
