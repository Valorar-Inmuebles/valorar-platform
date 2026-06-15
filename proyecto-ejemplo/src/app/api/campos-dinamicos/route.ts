import { getServerContext } from "@/lib/server/context/getServerContext";
import {
  camposDinamicosService,
  CampoDinamicoFieldError,
} from "@/lib/server/services/campos-dinamicos.service";
import { createCampoDinamicoSchema } from "@/lib/validation/schemas/campo-dinamico.schema";
import { z } from "zod";
import { handleApiError } from "@/lib/server/api/handle-api-error";

const querySchema = z.object({
  contexto: z.string().min(1, "contexto es requerido"),
  q: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);

    const parsed = querySchema.safeParse({
      contexto: searchParams.get("contexto"),
      q: searchParams.get("q") ?? undefined,
    });

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Parámetros inválidos" },
        { status: 400 },
      );
    }

    const data = await camposDinamicosService.searchByContexto(
      ctx,
      parsed.data.contexto,
      parsed.data.q,
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

    const parsed = createCampoDinamicoSchema.safeParse(body);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return Response.json(
        { error: issue?.message ?? "Datos inválidos" },
        { status: 400 },
      );
    }

    const result = await camposDinamicosService.create(ctx, parsed.data);

    return Response.json(result);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
