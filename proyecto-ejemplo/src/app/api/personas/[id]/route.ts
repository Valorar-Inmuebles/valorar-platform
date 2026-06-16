import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaService } from "@/lib/server/services/persona.service";
import { updatePersonaSchema } from "@/lib/validation/schemas/persona.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await personaService.getById(ctx, id);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();
    const { id } = await params;

    const parsed = updatePersonaSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    await personaService.update(ctx, id, parsed.data);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await personaService.delete(ctx, id);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
