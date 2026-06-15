import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesService } from "@/lib/server/services/anses.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string; expedienteId: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id, expedienteId } = await params;

    const file = await ansesService.getExpedienteArchivo(ctx, id, expedienteId);

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
