import { getServerContext } from "@/lib/server/context/getServerContext";
import { NotFoundError } from "@/lib/server/not-found-error";
import { casoExpedienteService } from "@/lib/server/services/caso-expediente.service";
import { casoExpedienteSchema } from "@/lib/validation/schemas/caso-expediente.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await casoExpedienteService.getAll(ctx, id);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = await req.json();

    const parsed = casoExpedienteSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await casoExpedienteService.create(ctx, id, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
