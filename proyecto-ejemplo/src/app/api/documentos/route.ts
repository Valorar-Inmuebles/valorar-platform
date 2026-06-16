import { getServerContext } from "@/lib/server/context/getServerContext";
import { documentoService } from "@/lib/server/services/documento.service";
import {
  documentoCreateFieldsSchema,
  documentoListQuerySchema,
} from "@/lib/validation/schemas/documento.schema";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(req: Request) {
  try {
    const ctx = await getServerContext();
    const { searchParams } = new URL(req.url);
    const parsed = documentoListQuerySchema.safeParse({
      entidad_tipo: searchParams.get("entidad_tipo"),
      entidad_id: searchParams.get("entidad_id"),
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Parámetros inválidos" },
        { status: 422 },
      );
    }

    const data = await documentoService.list(
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
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const parsed = documentoCreateFieldsSchema.safeParse({
      entidad_tipo: formData.get("entidad_tipo"),
      entidad_id: formData.get("entidad_id"),
      nombre_visible:
        formData.get("nombre_visible")?.toString().trim() || undefined,
      descripcion: formData.get("descripcion")?.toString() ?? undefined,
    });

    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Datos inválidos" },
        { status: 422 },
      );
    }

    const data = await documentoService.create(ctx, {
      ...parsed.data,
      file,
    });
    return Response.json(data, { status: 201 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
