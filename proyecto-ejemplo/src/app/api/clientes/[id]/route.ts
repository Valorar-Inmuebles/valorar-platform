import { getServerContext } from "@/lib/server/context/getServerContext";
import { clienteService } from "@/lib/server/services/cliente.service";
import { handleApiError } from "@/lib/server/api/handle-api-error";

// ✅ GET (FALTABA O ESTÁ MAL)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    const data = await clienteService.getById(ctx, id);

    return Response.json(data);
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

// ✅ PUT
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;
    const body = await req.json();

    await clienteService.update(ctx, id, body);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}

// ✅ DELETE
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await getServerContext();
    const { id } = await params;

    await clienteService.delete(ctx, id);

    return Response.json({ success: true });
  } catch (error: unknown) {
    return handleApiError(error, { request: req });
  }
}