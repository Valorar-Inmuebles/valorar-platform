import { getServerContext } from "@/lib/server/context/getServerContext";
import { documentoService } from "@/lib/server/services/documento.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await documentoService.remove(ctx, id);
    return new Response(null, { status: 204 });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
