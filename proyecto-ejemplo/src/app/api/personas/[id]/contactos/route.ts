import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaContactoService } from "@/lib/server/services/persona-contacto.service";
import { contactoSchema } from "@/lib/validation/schemas/persona-contacto.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await personaContactoService.getAll(ctx, id);
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

    const parsed = contactoSchema.safeParse(body);
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await personaContactoService.create(ctx, id, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
