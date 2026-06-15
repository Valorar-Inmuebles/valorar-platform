import { getServerContext } from "@/lib/server/context/getServerContext";
import { NotFoundError } from "@/lib/server/not-found-error";
import {
  casoService,
  CasoFieldError,
  CasoTramiteValoresValidationError,
} from "@/lib/server/services/caso.service";
import { updateCasoApiSchema } from "@/lib/validation/schemas/caso.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await casoService.getById(ctx, id);
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
    const body = (await req.json()) as Record<string, unknown>;
    const { id } = await params;

    const parsed = updateCasoApiSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const { valores_dinamicos, tramite_plantilla_id, ...casoPayload } =
      parsed.data;

    await casoService.update(ctx, id, casoPayload, {
      valores_dinamicos,
      tramite_plantilla_id,
    });

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await casoService.delete(ctx, id);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
