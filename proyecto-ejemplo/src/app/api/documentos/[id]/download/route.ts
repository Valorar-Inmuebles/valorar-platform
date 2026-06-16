import { getServerContext } from "@/lib/server/context/getServerContext";
import { documentoService } from "@/lib/server/services/documento.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const file = await documentoService.download(ctx, id);

    return new Response(Buffer.from(file.content), {
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
