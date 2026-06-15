import { getServerContext } from "@/lib/server/context/getServerContext";
import { personaService } from "@/lib/server/services/persona.service";
import { createPersonaSchema } from "@/lib/validation/schemas/persona.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const data = await personaService.getAll(ctx);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const { contactos, domicilios, ...personaBody } = body;

    const parsed = createPersonaSchema.safeParse(personaBody);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 }
      );
    }

    const data = await personaService.create(ctx, {
      ...parsed.data,
      contactos,
      domicilios,
    });

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
