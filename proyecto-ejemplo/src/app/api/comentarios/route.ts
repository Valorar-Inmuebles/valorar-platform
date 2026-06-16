import { getServerContext } from "@/lib/server/context/getServerContext";
import { comentarioService } from "@/lib/server/services/comentario.service";
import {
  comentarioCreateSchema,
  comentarioListQuerySchema,
} from "@/lib/validation/schemas/comentario.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);
    const parsed = comentarioListQuerySchema.safeParse({
      entidad_tipo: searchParams.get("entidad_tipo"),
      entidad_id: searchParams.get("entidad_id"),
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
        { status: 422 },
      );
    }

    const data = await comentarioService.list(
      ctx,
      parsed.data.entidad_tipo,
      parsed.data.entidad_id,
    );
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();
    const parsed = comentarioCreateSchema.safeParse(body);

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await comentarioService.create(ctx, parsed.data);
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
