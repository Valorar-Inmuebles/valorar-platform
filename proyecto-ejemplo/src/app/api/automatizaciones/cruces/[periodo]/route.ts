import { getServerContext } from "@/lib/server/context/getServerContext";
import { ansesCrucesService } from "@/lib/server/services/anses-cruces.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ periodo: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { periodo } = await params;

    const file = await ansesCrucesService.getCruceCsv(ctx, periodo);

    return new Response(file.content, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${file.filename}"`,
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
