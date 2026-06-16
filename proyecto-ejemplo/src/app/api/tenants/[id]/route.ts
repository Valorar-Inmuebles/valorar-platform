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
    const data = await tenantService.getById(ctx, id);
    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const body = await req.json();
    const { id } = await params;

    await tenantService.update(ctx, id, body);

    return Response.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await tenantService.delete(ctx, id);

    return Response.json({ success: true });

  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}