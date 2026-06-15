import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

function ansesArchivoErrorStatus(message: string): number {
  if (message === "No autenticado") return 401;
  if (
    message === "Cliente no encontrado" ||
    message === "Archivo no encontrado" ||
    message === "CUIL no encontrado" ||
    message === "Beneficio no encontrado" ||
    message === "Parámetros requeridos" ||
    message === "Período inválido"
  ) {
    return 404;
  }
  return 500;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; periodo: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, periodo } = await params;
    const beneficio = new URL(req.url).searchParams.get("beneficio") ?? "";

    const file = await ansesService.getReciboConstanciaArchivo(ctx, id, beneficio, periodo);

    return new Response(file.content, {
      status: 200,
      headers: {
        "Content-Type": file.contentType,
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
