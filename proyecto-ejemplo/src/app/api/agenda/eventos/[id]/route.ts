import { getServerContext } from "@/lib/server/context/getServerContext";
import { agendaService } from "@/lib/server/services/agenda.service";
import { agendaEventoUpdateSchema } from "@/lib/validation/schemas/agenda.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(req: Request, context: RouteContext) {
  try {
    const ctx = await getServerContext();
    const { id } = await context.params;
    const data = await agendaService.getById(ctx, id);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const ctx = await getServerContext();
    const { id } = await context.params;
    const body = await req.json();
    const parsed = agendaEventoUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await agendaService.update(ctx, id, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(req: Request, context: RouteContext) {
  try {
    const ctx = await getServerContext();
    const { id } = await context.params;
    await agendaService.remove(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
