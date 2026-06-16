import { getServerContext } from "@/lib/server/context/getServerContext";
import { tenantService } from "@/lib/server/services/tenant.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const stored = await tenantService.getLogo(ctx, id);

    return new Response(Buffer.from(stored.content), {
      headers: {
        "Content-Type": stored.contentType ?? "image/jpeg",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("logo");

    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: "Logo requerido" }, { status: 400 });
    }

    await tenantService.uploadLogo(ctx, id, file);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}
