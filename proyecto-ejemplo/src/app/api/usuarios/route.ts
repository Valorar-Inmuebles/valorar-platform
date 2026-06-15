import { getServerContext } from "@/lib/server/context/getServerContext";
import {
  usuarioService,
  UsuarioFieldError,
} from "@/lib/server/services/usuario.service";
import { createUsuarioSchema } from "@/lib/validation/schemas/usuario.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function POST(req: Request) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();

    const parsed = createUsuarioSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const data = await usuarioService.create(ctx, parsed.data);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
