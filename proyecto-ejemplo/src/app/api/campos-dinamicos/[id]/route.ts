import { getServerContext } from "@/lib/server/context/getServerContext";
import { camposDinamicosService } from "@/lib/server/services/campos-dinamicos.service";
import {
  setCampoDinamicoActivoSchema,
  updateCampoDinamicoSchema,
} from "@/lib/validation/schemas/campo-dinamico.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await camposDinamicosService.getById(ctx, id);

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

    const parsed = updateCampoDinamicoSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    await camposDinamicosService.update(ctx, id, parsed.data);

    return Response.json({ success: true });
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
    const body = await req.json();
    const { id } = await params;

    const parsed = setCampoDinamicoActivoSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    await camposDinamicosService.setActivo(ctx, id, parsed.data.activo);

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

    await camposDinamicosService.setActivo(ctx, id, false);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
